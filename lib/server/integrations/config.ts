import { z } from 'zod';

const IntegrationConfigSchema = z.object({
  bitgoApiBaseUrl: z.string().url().default('https://app.bitgo-test.com/api/v2'),
  bitgoAccessToken: z.string().optional(),
  bridgeFeePercent: z.number().min(0).max(10).default(0.5),
});

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;

let cachedConfig: IntegrationConfig | null = null;

export function getIntegrationConfig(): IntegrationConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = IntegrationConfigSchema.parse({
    bitgoApiBaseUrl: process.env.BITGO_API_URL || 'https://app.bitgo-test.com/api/v2',
    bitgoAccessToken: process.env.BITGO_ACCESS_TOKEN,
    bridgeFeePercent: process.env.BRIDGE_FEE_PERCENT ? Number(process.env.BRIDGE_FEE_PERCENT) : 0.5,
  });

  cachedConfig = parsed;
  return parsed;
}
