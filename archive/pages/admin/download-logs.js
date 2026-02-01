import { useState, useEffect } from 'react';

export default function DownloadLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // This would fetch download logs from the database
        // For now, showing placeholder structure
        setLogs([
          { id: 1, timestamp: '2025-01-15 10:30:00', email: 'investor@example.com', watermark: 'Generated for investor@example.com', ip: '192.168.1.1' },
          { id: 2, timestamp: '2025-01-15 09:15:00', email: null, code: 'INV001', watermark: 'Code: INV001', ip: '10.0.0.1' }
        ]);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-12">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-6">Download Logs (Admin)</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Timestamp</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">IP</th>
              <th className="px-4 py-2 text-left">Watermark</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{log.timestamp}</td>
                <td className="px-4 py-2">{log.email || '—'}</td>
                <td className="px-4 py-2">{log.code || '—'}</td>
                <td className="px-4 py-2">{log.ip}</td>
                <td className="px-4 py-2 font-mono text-sm">{log.watermark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export async function getServerSideProps() {
  return { props: {} };
}
