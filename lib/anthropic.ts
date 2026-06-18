import Anthropic from '@anthropic-ai/sdk';

const gatewayKey = process.env.AI_GATEWAY_KEY;

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ...(gatewayKey && {
    defaultHeaders: { 'x-ai-gateway-api-key': `Bearer ${gatewayKey}` },
  }),
});
