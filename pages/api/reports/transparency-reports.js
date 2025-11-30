import Database from "@replit/database";
const db = new Database();

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Add new report
      const { type, description, link } = req.body;
      const timestamp = new Date().toISOString();
      const report = {
        type: type || "Monthly Report",
        date: timestamp.split('T')[0],
        description: description || "",
        link: link || null,
        timestamp
      };
      
      await db.set(`transparency-report:${timestamp}`, report);
      return res.json({ success: true, report });
    } else {
      // Get all reports
      const keys = await db.list('transparency-report:');
      if (!keys || keys.length === 0) return res.status(204).end();
      
      const reports = [];
      const sortedKeys = Array.isArray(keys) ? keys.sort().reverse() : Object.keys(keys).sort().reverse();
      for (const key of sortedKeys) {
        try {
          const data = await db.get(key);
          if (data) reports.push(data);
        } catch (e) {}
      }
      
      return res.json({ reports });
    }
  } catch (error) {
    console.error("Transparency reports error:", error);
    return res.status(500).json({ error: "Failed to fetch transparency reports" });
  }
}