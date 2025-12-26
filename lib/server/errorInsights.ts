import { generateText } from './gemini';
import { db } from '../../server/db';
import { errorLogs } from '../../shared/schema';
import { desc, eq, sql, and, gte } from 'drizzle-orm';

interface ErrorLogEntry {
  id?: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  path?: string;
  method?: string;
  statusCode?: number;
  stack?: string;
  userAgent?: string;
  requestBody?: any;
  additionalInfo?: Record<string, any>;
  source?: string;
  environment?: string;
}

export async function persistError(entry: ErrorLogEntry): Promise<void> {
  try {
    await db.insert(errorLogs).values({
      level: entry.level,
      message: entry.message,
      path: entry.path,
      method: entry.method,
      statusCode: entry.statusCode,
      stack: entry.stack,
      userAgent: entry.userAgent,
      requestBody: entry.requestBody,
      additionalInfo: entry.additionalInfo,
      source: entry.source || 'server',
      environment: entry.environment || 'development',
    });
  } catch (error) {
    console.error('Failed to persist error log:', error);
  }
}

export async function getPersistedLogs(options: {
  level?: string;
  limit?: number;
  resolved?: boolean;
  hoursAgo?: number;
} = {}): Promise<any[]> {
  try {
    const { level, limit = 100, resolved, hoursAgo } = options;
    
    const conditions = [];
    
    if (level && level !== 'all') {
      conditions.push(eq(errorLogs.level, level as any));
    }
    
    if (resolved !== undefined) {
      conditions.push(eq(errorLogs.resolved, resolved));
    }
    
    if (hoursAgo) {
      const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      conditions.push(gte(errorLogs.createdAt, cutoff));
    }
    
    const query = conditions.length > 0
      ? db.select().from(errorLogs).where(and(...conditions)).orderBy(desc(errorLogs.createdAt)).limit(limit)
      : db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(limit);
    
    return await query;
  } catch (error) {
    console.error('Failed to get persisted logs:', error);
    return [];
  }
}

export async function clearPersistedLogs(): Promise<void> {
  try {
    await db.delete(errorLogs);
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
}

export async function analyzeErrorPatterns(logs: any[]): Promise<string> {
  if (logs.length === 0) {
    return 'No errors to analyze. Your application is running smoothly.';
  }

  const errorSummary = logs.slice(0, 20).map(log => ({
    level: log.level,
    message: log.message?.slice(0, 200),
    path: log.path,
    statusCode: log.statusCode,
    time: log.createdAt || log.timestamp
  }));

  const prompt = `You are an expert developer analyzing application error logs. Analyze these recent errors and provide insights:

Error Logs (most recent 20):
${JSON.stringify(errorSummary, null, 2)}

Provide a concise analysis including:
1. Pattern Summary: What types of errors are occurring most frequently?
2. Root Causes: What are the likely root causes?
3. Priority Issues: Which errors should be fixed first?
4. Suggested Fixes: Specific actionable recommendations

Keep your response under 300 words. Be direct and actionable.`;

  try {
    const analysis = await generateText(prompt, { model: 'gemini-2.5-flash' });
    return analysis;
  } catch (error) {
    console.error('AI analysis failed:', error);
    return 'Unable to generate AI analysis at this time.';
  }
}

export async function generateErrorSummary(logs: any[]): Promise<{
  totalErrors: number;
  byLevel: Record<string, number>;
  byPath: Record<string, number>;
  recentTrend: string;
  aiSummary: string;
}> {
  const byLevel: Record<string, number> = { error: 0, warn: 0, info: 0, debug: 0 };
  const byPath: Record<string, number> = {};

  logs.forEach(log => {
    byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    if (log.path) {
      byPath[log.path] = (byPath[log.path] || 0) + 1;
    }
  });

  const recentCount = logs.filter(l => {
    const logTime = new Date(l.createdAt || l.timestamp).getTime();
    return Date.now() - logTime < 60 * 60 * 1000;
  }).length;

  const trend = recentCount > 10 ? 'High activity' : recentCount > 5 ? 'Moderate activity' : 'Low activity';

  let aiSummary = 'No recent errors to summarize.';
  if (logs.length > 0) {
    try {
      const prompt = `Summarize these ${logs.length} application logs in 2-3 sentences. Focus on the most important issues:
${JSON.stringify(logs.slice(0, 10).map(l => ({ level: l.level, message: l.message?.slice(0, 100) })), null, 2)}`;
      aiSummary = await generateText(prompt, { model: 'gemini-2.5-flash' });
    } catch {
      aiSummary = `${logs.length} logs recorded. ${byLevel.error} errors, ${byLevel.warn} warnings.`;
    }
  }

  return {
    totalErrors: logs.length,
    byLevel,
    byPath,
    recentTrend: trend,
    aiSummary
  };
}

export async function generateIncidentReport(logs: any[], options: {
  title?: string;
  timeRange?: string;
} = {}): Promise<string> {
  const { title = 'Error Incident Report', timeRange = 'Last 24 hours' } = options;

  const errorLogs = logs.filter(l => l.level === 'error');
  const warnLogs = logs.filter(l => l.level === 'warn');

  const prompt = `Generate a professional incident report for a development team based on these error logs:

Report Title: ${title}
Time Range: ${timeRange}
Total Errors: ${errorLogs.length}
Total Warnings: ${warnLogs.length}

Sample Errors:
${JSON.stringify(errorLogs.slice(0, 5).map(l => ({
  message: l.message?.slice(0, 300),
  path: l.path,
  statusCode: l.statusCode,
  time: l.createdAt
})), null, 2)}

Generate a structured incident report with:
1. Executive Summary (2-3 sentences)
2. Impact Assessment
3. Root Cause Analysis
4. Affected Components
5. Recommended Actions
6. Prevention Measures

Keep it professional and actionable. Format as plain text, no markdown.`;

  try {
    const report = await generateText(prompt, { model: 'gemini-2.5-flash' });
    return report;
  } catch (error) {
    return `Incident Report Generation Failed\n\nTotal Errors: ${errorLogs.length}\nTotal Warnings: ${warnLogs.length}\n\nUnable to generate AI report at this time.`;
  }
}

export async function suggestFix(errorMessage: string, stack?: string): Promise<string> {
  const prompt = `As an expert developer, suggest a fix for this error:

Error: ${errorMessage}
${stack ? `\nStack Trace:\n${stack.slice(0, 500)}` : ''}

Provide:
1. What likely caused this error
2. Step-by-step fix instructions
3. Code example if applicable

Keep response under 200 words. Be specific and actionable.`;

  try {
    const suggestion = await generateText(prompt, { model: 'gemini-2.5-flash' });
    return suggestion;
  } catch {
    return 'Unable to generate fix suggestion at this time.';
  }
}
