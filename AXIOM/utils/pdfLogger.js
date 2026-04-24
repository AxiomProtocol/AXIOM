import Database from "@replit/database"; const db=new Database();
export async function logDownload(email, code, watermark){
  const timestamp=new Date().toISOString();
  const entry={email:email||null, code:code||null, watermark, timestamp};
  await db.set(`download:${timestamp}:${code||email||"anon"}`, entry);
  return entry;
}