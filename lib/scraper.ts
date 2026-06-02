import { chromium } from 'playwright';

const MAX_CHARS_PER_PAGE = 3000;
const MAX_NAV_PAGES = 6;   // all nav links, up to this many
const MAX_SCORED_PAGES = 2; // non-nav scored pages to backfill remaining slots
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

// Nav selectors — elements the site owner put at the top for a reason
const NAV_SELECTORS = [
  'nav', 'header nav', '[role="navigation"]',
  'header a[href]', '.navbar a[href]', '.nav a[href]', '#nav a[href]', '#menu a[href]',
];

async function scrapePage(
  url: URL,
  browser: Browser
): Promise<{
  title: string;
  text: string;
  navLinks: Array<{ href: string; text: string }>;
  allLinks: Array<{ href: string; text: string }>;
}> {
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

  // Collect nav links and all links BEFORE stripping anything.
  // Use $$eval (selector + simple inline callback) to avoid esbuild injecting
  // __name helpers that don't exist in the browser context.
  const navSelector = NAV_SELECTORS.map(s => `${s}[href], ${s} a[href]`).join(', ');

  const navLinks = await page.$$eval(navSelector, (anchors, origin) =>
    (anchors as HTMLAnchorElement[])
      .map(a => ({ href: a.href ?? '', text: (a.textContent ?? '').replace(/\s+/g, ' ').trim() }))
      .filter(({ href }) => {
        try { const u = new URL(href); return u.origin === origin && u.pathname.length > 1; }
        catch { return false; }
      }), url.origin);

  const allLinks = await page.$$eval('a[href]', (anchors, origin) =>
    (anchors as HTMLAnchorElement[])
      .map(a => ({ href: a.href ?? '', text: (a.textContent ?? '').replace(/\s+/g, ' ').trim() }))
      .filter(({ href }) => {
        try { const u = new URL(href); return u.origin === origin && u.pathname.length > 1; }
        catch { return false; }
      }), url.origin);

  // Extract key identity signals BEFORE stripping — h1/h2 inside <header> would
  // otherwise be removed before the content pass runs.
  const identitySignals: string[] = await page.evaluate(() => {
    const seen = new Set<string>();
    const results: string[] = [];
    document.querySelectorAll('h1, h2').forEach((el) => {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text.length > 3 && !seen.has(text)) { seen.add(text); results.push(text); }
    });
    // Logo / hero images often carry the business name in alt text
    document.querySelectorAll('img[alt]').forEach((el) => {
      const alt = ((el as HTMLImageElement).alt ?? '').replace(/\s+/g, ' ').trim();
      if (alt.length > 5 && !seen.has(alt)) { seen.add(alt); results.push(`[image: ${alt}]`); }
    });
    return results;
  });

  // Strip boilerplate then extract remaining content
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

  const allText = [
    ...(identitySignals.length ? [`[Key headings & images]\n${identitySignals.join('\n')}`, ''] : []),
    ...rawTexts,
  ].join('\n').slice(0, MAX_CHARS_PER_PAGE);

  return { title, text: allText, navLinks, allLinks };
}

async function attemptScrape(url: URL, browser: Browser): Promise<Awaited<ReturnType<typeof scrapePage>>> {
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

    // Scrape homepage and collect nav + all links
    const home = await attemptScrape(url, browser);

    const seen = new Set<string>([url.pathname]);

    function dedupeUrl(href: string): URL | null {
      let linkUrl: URL;
      try { linkUrl = new URL(href); } catch { return null; }
      const pathname = linkUrl.pathname.replace(/\/$/, '') || '/';
      if (seen.has(pathname)) return null;
      seen.add(pathname);
      return linkUrl;
    }

    // Tier 1: nav links — follow unconditionally (site owner put them there)
    const navPages: Array<{ url: URL; label: string }> = [];
    for (const { href, text } of home.navLinks) {
      const linkUrl = dedupeUrl(href);
      if (!linkUrl) continue;
      // Use link text as label, fall back to pathname segment
      const label = text || linkUrl.pathname.split('/').filter(Boolean).pop() || 'Page';
      navPages.push({ url: linkUrl, label });
      if (navPages.length >= MAX_NAV_PAGES) break;
    }

    // Tier 2: scored non-nav links to backfill remaining slots
    const scoredPages: Array<{ url: URL; score: number; label: string }> = [];
    for (const { href, text } of home.allLinks) {
      const linkUrl = dedupeUrl(href);
      if (!linkUrl) continue;
      const match = scoreLink(linkUrl.pathname, text);
      if (match) scoredPages.push({ url: linkUrl, score: match.score, label: match.label });
    }

    const backfillSlots = Math.max(0, MAX_NAV_PAGES - navPages.length);
    const backfill = scoredPages
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(backfillSlots, MAX_SCORED_PAGES));

    const toScrape = [...navPages, ...backfill];

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

export { extractUrl } from '@/lib/utils';
