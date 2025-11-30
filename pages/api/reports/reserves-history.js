import Database from "@replit/database";
const db = new Database();

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Save new snapshot
      const { totalUSD, reserves } = req.body;
      const timestamp = new Date().toISOString();
      const entry = {
        date: timestamp.split('T')[0],
        totalUSD: totalUSD || 0,
        reserves: reserves || [],
        timestamp
      };
      
      await db.set(`reserve-snapshot:${timestamp}`, entry);
      return res.json({ success: true, entry });
    } else {
      // Get history
      const keys = await db.list('reserve-snapshot:');
      if (!keys || keys.length === 0) return res.status(204).end();
      
      const snapshots = [];
      const sortedKeys = Array.isArray(keys) ? keys.sort() : Object.keys(keys).sort();
      for (const key of sortedKeys) {
        try {
          const data = await db.get(key);
          if (data) snapshots.push(data);
        } catch (e) {}
      }
      
      return res.json({ history: snapshots });
    }
  } catch (error) {
    console.error("Reserves history error:", error);
    return res.status(500).json({ error: "Failed to process reserves history" });
  }
}