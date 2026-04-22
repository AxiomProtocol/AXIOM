export default function handler(req, res) {
  res.status(200).json({ status: 'ok', timestamp: Date.now(), v: '2026-02-10-pg' });
}
