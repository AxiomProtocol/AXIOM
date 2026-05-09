export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    ready: true,
    timestamp: Date.now(),
    v: '2026-02-10-pg',
  });
}
