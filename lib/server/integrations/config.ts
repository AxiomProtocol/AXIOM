import { z } from 'zod';

const IntegrationConfigSchema = z.object({
  mode: z.enum(['mock', 'live']).default('mock'),
  unitApiBaseUrl: z.string().url().default('https://api.s.unit.sh'),
  unitApiToken: z.string().optional(),
  bitgoApiBaseUrl: z.string().url().default('https://app.bitgo-test.com/api/v2'),
  bitgoAccessToken: z.string().optional(),
  bridgeFeePercent: z.number().min(0).max(10).default(0.5),
});

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;

let cachedConfig: IntegrationConfig | null = null;

export function getIntegrationConfig(): IntegrationConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = IntegrationConfigSchema.parse({
    mode: (process.env.BANKING_INTEGRATION_MODE || 'mock').toLowerCase(),
    unitApiBaseUrl: process.env.UNIT_API_BASE_URL || 'https://api.s.unit.sh',
    unitApiToken: process.env.UNIT_API_TOKEN,
    bitgoApiBaseUrl: process.env.BITGO_API_BASE_URL || 'https://app.bitgo-test.com/api/v2',
    bitgoAccessToken: process.env.BITGO_ACCESS_TOKEN,
    bridgeFeePercent: process.env.BRIDGE_FEE_PERCENT ? Number(process.env.BRIDGE_FEE_PERCENT) : 0.5,
  });

  if (parsed.mode === 'live') {
    if (!parsed.unitApiToken) {
      throw new Error('UNIT_API_TOKEN is required when BANKING_INTEGRATION_MODE=live');
    }
    if (!parsed.bitgoAccessToken) {
      throw new Error('BITGO_ACCESS_TOKEN is required when BANKING_INTEGRATION_MODE=live');
    }
  }

  cachedConfig = parsed;
  return parsed;
}
