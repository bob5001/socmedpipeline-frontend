import { chromium } from 'playwright';

const MAX_CHARS_PER_PAGE = 2000;
const MAX_EXTRA_PAGES = 4;
const NAVIGATION_TIMEOUT = 15000;

const CONTENT_SELECTORS = ['h1', 'h2', 'h3', 'p', 'li', 'blockquote'];

const STRIP_SELECTORS = [
  'nav', 'header', 'footer', 'aside',
  'script', 'style', 'noscript', 'template',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '.nav', '.navbar', '.menu', '.cookie', '.popup', '.modal',
];

// Keywords that signal a page is likely to contain useful business content.
// Higher score = higher priority. Pages with no match are skipped.
const PAGE_SCORE_RULES: { pattern: RegExp; score: number; label: string }[] = [
  { pattern: /\babout\b/i,                          score: 10, label: 'About' },
  { pattern: /\bour[- ]?story\b/i,                  score: 10, label: 'Our Story' },
  { pattern: /\bwho[- ]?we[- ]?are\b/i,             score: 10, label: 'Who We Are' },
  { pattern: /\bteam\b/i,                           score:  8, label: 'Team' },
  { pattern: /\bservice[s]?\b/i,                    score: 10, label: 'Services' },
  { pattern: /\bwhat[- ]?we[- ]?do\b/i,             score: 10, label: 'What We Do' },
  { pattern: /\bsolution[s]?\b/i,                   score:  7, label: 'Solutions' },
  { pattern: /\bwork\b/i,                           score:  6, label: 'Work' },
  { pattern: /\bportfolio\b/i,                      score:  6, label: 'Portfolio' },
  { pattern: /\boffering[s]?\b/i,                   score:  7, label: 'Offerings' },
  { pattern: /\bcontact\b/i,                        score:  8, label: 'Contact' },
  { pattern: /\blocation[s]?\b/i,                   score:  7, label: 'Location' },
  { pattern: /\bfaq\b/i,                            score:  5, label: 'FAQ' },
  { pattern: /\btestimonial[s]?\b/i,                score:  6, label: 'Testimonials' },
  { pattern: /\breview[s]?\b/i,                     score:  5, label: 'Reviews' },
];

export interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  error?: string;
}

type Browser = Awaited<ReturnType<typeof chromium.launch>>;

function scoreLink(href: string, linkText: string): { score: number; label: string } | null {
  const haystack = `${href} ${linkText}`;
  let best: { score: number; label: string } | null = null;
  for (const rule of PAGE_SCORE_RULES) {
    if (rule.pattern.test(haystack)) {
      if (!best || rule.score > best.score) {
        best = { score: rule.score, label: rule.label };
      }
    }
  }
  return best;
}

async function scrapePage(
  url: URL,
  browser: Browser
): Promise<{ title: string; text: string; links: Array<{ href: string; text: string }> }> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: { Accept: 'text/html' },
  });

  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  const page = await context.newPage();
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });

  const title = await page.title();

  // Collect internal links before stripping nav
  const links: Array<{ href: string; text: string }> = await page.evaluate((origin: string) => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: (a.textContent ?? '').replace(/\s+/g, ' ').trim(),
      }))
      .filter(({ href }) => {
        try {
          const u = new URL(href);
          return u.origin === origin && u.pathname !== '/' && u.pathname !== '';
        } catch {
          return false;
        }
      });
  }, url.origin);

  // Strip boilerplate then extract content
  await page.evaluate((selectors: string[]) => {
    selectors.forEach((sel) =>
      document.querySelectorAll(sel).forEach((el) => el.remove())
    );
  }, STRIP_SELECTORS);

  const rawTexts: string[] = await page.evaluate((selectors: string[]) => {
    const seen = new Set<string>();
    const results: string[] = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text.length > 20 && !seen.has(text)) {
          seen.add(text);
          results.push(text);
        }
      });
    });
    return results;
  }, CONTENT_SELECTORS);

  await context.close();

  return { title, text: rawTexts.join('\n').slice(0, MAX_CHARS_PER_PAGE), links };
}

async function attemptScrape(url: URL, browser: Browser): Promise<ReturnType<typeof scrapePage>> {
  try {
    return await scrapePage(url, browser);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isNetworkError =
      message.includes('ERR_NAME_NOT_RESOLVED') ||
      message.includes('ERR_CONNECTION_REFUSED') ||
      message.includes('ERR_CONNECTION_TIMED_OUT');

    if (isNetworkError && url.hostname.startsWith('www.')) {
      const noWww = new URL(url.toString());
      noWww.hostname = url.hostname.replace(/^www\./, '');
      return scrapePage(noWww, browser);
    }
    throw err;
  }
}

export async function scrapeWebsite(rawUrl: string): Promise<ScrapeResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
  } catch {
    return { url: rawUrl, title: '', content: '', error: 'Invalid URL' };
  }

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });

    // Scrape homepage and collect internal links
    const home = await attemptScrape(url, browser);

    // Score and deduplicate candidate pages
    const seen = new Set<string>([url.pathname]);
    const candidates: Array<{ url: URL; score: number; label: string }> = [];

    for (const { href, text } of home.links) {
      let linkUrl: URL;
      try { linkUrl = new URL(href); } catch { continue; }

      const pathname = linkUrl.pathname.replace(/\/$/, '') || '/';
      if (seen.has(pathname)) continue;
      seen.add(pathname);

      const match = scoreLink(pathname, text);
      if (match) {
        candidates.push({ url: linkUrl, score: match.score, label: match.label });
      }
    }

    // Take the highest-scoring pages up to the cap
    const toScrape = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_EXTRA_PAGES);

    const ERROR_PAGE_SIGNALS = [
      "couldn't find the page",
      "page not found",
      "404",
      "this page doesn't exist",
      "no longer exists",
    ];

    // Scrape them in parallel
    const extraPages = await Promise.all(
      toScrape.map(async ({ url: pageUrl, label }) => {
        try {
          const result = await scrapePage(pageUrl, browser!);
          const lc = result.text.toLowerCase();
          if (ERROR_PAGE_SIGNALS.some((s) => lc.includes(s))) return null;
          return { label, url: pageUrl, text: result.text };
        } catch {
          return null;
        }
      })
    );

    // Assemble final content with page labels
    const sections: string[] = [`[Homepage]\n${home.text}`];
    for (const page of extraPages) {
      if (page?.text) {
        sections.push(`[${page.label} — ${page.url.pathname}]\n${page.text}`);
      }
    }

    const content = sections.join('\n\n---\n\n');

    return { url: url.toString(), title: home.title, content };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { url: url.toString(), title: '', content: '', error: message };
  } finally {
    await browser?.close();
  }
}

export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)>\]"']+/i);
  return match ? match[0] : null;
}
