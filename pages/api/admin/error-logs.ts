import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  persistError, 
  getPersistedLogs, 
  clearPersistedLogs,
  analyzeErrorPatterns,
  generateErrorSummary,
  generateIncidentReport,
  suggestFix
} from '../../../lib/server/errorInsights';
import { getRecentErrors, getErrorsByLevel, clearLogs, logError, logWarning, logInfo } from '../../../lib/errorLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  if (req.method === 'GET') {
    const { level, limit = '50', source = 'both', hoursAgo } = req.query;
    const parsedLimit = parseInt(limit as string, 10) || 50;
    const parsedHours = hoursAgo ? parseInt(hoursAgo as string, 10) : undefined;

    try {
      let logs: any[] = [];
      
      if (source === 'memory' || source === 'both') {
        const memoryLogs = level && level !== 'all' 
          ? getErrorsByLevel(level as 'error' | 'warn' | 'info', parsedLimit)
          : getRecentErrors(parsedLimit);
        logs = [...logs, ...memoryLogs.map(l => ({ ...l, source: 'memory' }))];
      }
      
      if (source === 'database' || source === 'both') {
        const dbLogs = await getPersistedLogs({
          level: level as string,
          limit: parsedLimit,
          hoursAgo: parsedHours
        });
        logs = [...logs, ...dbLogs.map(l => ({ ...l, source: 'database' }))];
      }

      logs.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timestamp).getTime();
        const timeB = new Date(b.createdAt || b.timestamp).getTime();
        return timeB - timeA;
      });

      return res.status(200).json({ logs: logs.slice(0, parsedLimit), count: logs.length });
    } catch (error) {
      console.error('Error fetching logs:', error);
      const memoryLogs = level && level !== 'all' 
        ? getErrorsByLevel(level as 'error' | 'warn' | 'info', parsedLimit)
        : getRecentErrors(parsedLimit);
      return res.status(200).json({ logs: memoryLogs, count: memoryLogs.length });
    }
  }

  if (req.method === 'POST') {
    if (action === 'analyze') {
      try {
        const logs = await getPersistedLogs({ limit: 50 });
        const memoryLogs = getRecentErrors(50);
        const allLogs = [...logs, ...memoryLogs];
        const analysis = await analyzeErrorPatterns(allLogs);
        return res.status(200).json({ success: true, analysis });
      } catch (error) {
        return res.status(500).json({ success: false, error: 'Analysis failed' });
      }
    }

    if (action === 'summary') {
      try {
        const logs = await getPersistedLogs({ limit: 100 });
        const memoryLogs = getRecentErrors(100);
        const allLogs = [...logs, ...memoryLogs];
        const summary = await generateErrorSummary(allLogs);
        return res.status(200).json({ success: true, summary });
      } catch (error) {
        return res.status(500).json({ success: false, error: 'Summary generation failed' });
      }
    }

    if (action === 'incident-report') {
      try {
        const { title, timeRange } = req.body;
        const logs = await getPersistedLogs({ limit: 100, hoursAgo: 24 });
        const memoryLogs = getRecentErrors(100);
        const allLogs = [...logs, ...memoryLogs];
        const report = await generateIncidentReport(allLogs, { title, timeRange });
        return res.status(200).json({ success: true, report });
      } catch (error) {
        return res.status(500).json({ success: false, error: 'Report generation failed' });
      }
    }

    if (action === 'suggest-fix') {
      try {
        const { message, stack } = req.body;
        const suggestion = await suggestFix(message, stack);
        return res.status(200).json({ success: true, suggestion });
      } catch (error) {
        return res.status(500).json({ success: false, error: 'Fix suggestion failed' });
      }
    }

    if (action === 'log') {
      try {
        const { level, message, path, method, statusCode, stack, userAgent, additionalInfo } = req.body;
        
        const logEntry = {
          level: level || 'error',
          message,
          path,
          method,
          statusCode,
          stack,
          userAgent,
          additionalInfo,
          source: 'client',
          environment: process.env.NODE_ENV || 'development'
        };

        await persistError(logEntry);
        
        if (level === 'error') {
          logError(message, { path, method, statusCode, userAgent, additionalInfo });
        } else if (level === 'warn') {
          logWarning(message, additionalInfo);
        } else {
          logInfo(message, additionalInfo);
        }

        return res.status(200).json({ success: true });
      } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to log error' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  if (req.method === 'DELETE') {
    try {
      clearLogs();
      await clearPersistedLogs();
      return res.status(200).json({ message: 'All logs cleared' });
    } catch (error) {
      clearLogs();
      return res.status(200).json({ message: 'Memory logs cleared' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
