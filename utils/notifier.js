import nodemailer from "nodemailer";
export async function sendEmailNotification(p){
  const {SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS,EMAIL_FROM,EMAIL_TO}=process.env;
  if(!SMTP_HOST||!SMTP_PORT||!SMTP_USER||!SMTP_PASS||!EMAIL_FROM||!EMAIL_TO) return;
  const t=nodemailer.createTransporter({host:SMTP_HOST,port:Number(SMTP_PORT),secure:Number(SMTP_PORT)===465,auth:{user:SMTP_USER,pass:SMTP_PASS}});
  const subject=`Transparency Report Download — ${p.email||p.code||"anonymous"}`;
  const text=`Timestamp: ${p.timestamp}\nEmail: ${p.email||"-"}\nCode: ${p.code||"-"}\nWatermark: ${p.watermark}\nIP: ${p.ip||"-"}\nUA: ${p.userAgent||"-"}`;
  await t.sendMail({from:EMAIL_FROM,to:EMAIL_TO,subject,text});
}
export async function sendTelegramNotification(p){
  const {TELEGRAM_BOT_TOKEN,TELEGRAM_CHAT_ID}=process.env; if(!TELEGRAM_BOT_TOKEN||!TELEGRAM_CHAT_ID) return;
  const msg=`*Transparency Report Download*\n*Time:* ${p.timestamp}\n*Email:* ${p.email||"-"}\n*Code:* ${p.code||"-"}\n*Watermark:* ${p.watermark}\n*IP:* ${p.ip||"-"}\n*UA:* ${p.userAgent||"-"}`;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({chat_id:TELEGRAM_CHAT_ID,text:msg,parse_mode:"Markdown",disable_web_page_preview:true})
  });
}