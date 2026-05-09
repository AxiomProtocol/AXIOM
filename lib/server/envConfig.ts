type AxiomEnvironment = 'local' | 'staging' | 'production';
type AiAgentMode = 'off' | 'observe' | 'propose';
type AuditLogSink = 'database' | 'console' | 'file';

interface EnvConfig {
  axiomEnv: AxiomEnvironment;
  aiAgentMode: AiAgentMode;
  auditLogSink: AuditLogSink;
  stagingBaseUrl: string | null;
  prodBaseUrl: string | null;
  isProduction: boolean;
  isStaging: boolean;
  isLocal: boolean;
  aiAgentEnabled: boolean;
  aiAgentCanPropose: boolean;
}

const VALID_AXIOM_ENVS: AxiomEnvironment[] = ['local', 'staging', 'production'];
const VALID_AI_MODES: AiAgentMode[] = ['off', 'observe', 'propose'];
const VALID_AUDIT_SINKS: AuditLogSink[] = ['database', 'console', 'file'];

function getAxiomEnv(): AxiomEnvironment {
  const env = process.env.AXIOM_ENV?.toLowerCase() as AxiomEnvironment;
  if (env && VALID_AXIOM_ENVS.includes(env)) {
    return env;
  }
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  return 'local';
}

function getAiAgentMode(axiomEnv: AxiomEnvironment): AiAgentMode {
  const mode = process.env.AI_AGENT_MODE?.toLowerCase() as AiAgentMode;
  
  if (axiomEnv === 'production') {
    if (mode === 'propose' || mode === 'observe') {
      const explicitlyEnabled = process.env.AI_AGENT_PRODUCTION_OVERRIDE === 'true';
      if (!explicitlyEnabled) {
        console.warn('[EnvConfig] AI_AGENT_MODE forced to "off" in production (no override)');
        return 'off';
      }
    }
  }
  
  if (mode && VALID_AI_MODES.includes(mode)) {
    return mode;
  }
  
  return 'off';
}

function getAuditLogSink(): AuditLogSink {
  const sink = process.env.AUDIT_LOG_SINK?.toLowerCase() as AuditLogSink;
  if (sink && VALID_AUDIT_SINKS.includes(sink)) {
    return sink;
  }
  return 'database';
}

function validateStagingSecrets(axiomEnv: AxiomEnvironment): void {
  if (axiomEnv !== 'staging') return;
  
  const requiredSecrets = [
    'DATABASE_URL',
    'SESSION_SECRET',
  ];
  
  const missing = requiredSecrets.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const errorMsg = `[EnvConfig] FATAL: Missing required secrets in staging: ${missing.join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

function buildEnvConfig(): EnvConfig {
  const axiomEnv = getAxiomEnv();
  const aiAgentMode = getAiAgentMode(axiomEnv);
  const auditLogSink = getAuditLogSink();
  
  validateStagingSecrets(axiomEnv);
  
  return {
    axiomEnv,
    aiAgentMode,
    auditLogSink,
    stagingBaseUrl: process.env.STAGING_BASE_URL || null,
    prodBaseUrl: process.env.PROD_BASE_URL || null,
    isProduction: axiomEnv === 'production',
    isStaging: axiomEnv === 'staging',
    isLocal: axiomEnv === 'local',
    aiAgentEnabled: aiAgentMode !== 'off',
    aiAgentCanPropose: aiAgentMode === 'propose',
  };
}

let _envConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!_envConfig) {
    _envConfig = buildEnvConfig();
  }
  return _envConfig;
}

export function isAiAgentAllowed(): boolean {
  const config = getEnvConfig();
  return config.aiAgentEnabled;
}

export function canAiAgentPropose(): boolean {
  const config = getEnvConfig();
  return config.aiAgentCanPropose;
}

export function requireStaging(operationName: string): void {
  const config = getEnvConfig();
  if (config.isProduction) {
    throw new Error(`[EnvConfig] Operation "${operationName}" is not allowed in production`);
  }
}

export function requireNonProduction(operationName: string): void {
  requireStaging(operationName);
}

export function assertNotProduction(operationName: string): { allowed: boolean; reason?: string } {
  const config = getEnvConfig();
  if (config.isProduction) {
    return {
      allowed: false,
      reason: `Operation "${operationName}" is blocked in production environment`,
    };
  }
  return { allowed: true };
}

export function getBaseUrl(): string {
  const config = getEnvConfig();
  if (config.isProduction && config.prodBaseUrl) {
    return config.prodBaseUrl;
  }
  if (config.isStaging && config.stagingBaseUrl) {
    return config.stagingBaseUrl;
  }
  return process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_BASE_URL
    || 'http://localhost:5000';
}

export type { AxiomEnvironment, AiAgentMode, AuditLogSink, EnvConfig };
