import PDFDocument from 'pdfkit';
import { addCoverPage } from '../../../utils/pdfCoverPage';
import { addTableOfContents } from '../../../utils/pdfTOC';
import { addAppendix } from '../../../utils/pdfAppendix';
import { addFooter } from '../../../utils/pdfFooter';
import { addWatermark } from '../../../utils/pdfWatermark';
import { logDownload } from '../../../utils/pdfLogger';
import { sendEmailNotification, sendTelegramNotification } from '../../../utils/notifier';
import { shouldNotify } from '../../../utils/rateLimiter';

export default async function handler(req, res) {
  try {
    const { email, code } = req.query;
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sovran-transparency-report.pdf"');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add cover page
    addCoverPage(doc, './public/images/logo.png');
    
    // Add table of contents
    const sections = [
      { title: 'Executive Summary' },
      { title: 'Proof of Reserves' },
      { title: 'Financial Performance' },
      { title: 'Growth Metrics' },
      { title: 'Appendix' }
    ];
    addTableOfContents(doc, sections);
    
    // Fetch real data for report
    try {
      const reservesRes = await fetch(`${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://' + req.headers.host}/api/reports/proof-of-reserves`);
      const reservesData = reservesRes.ok ? await reservesRes.json() : { reserves: [], totalUSD: 0 };
      
      // Executive Summary
      doc.addPage();
      doc.fontSize(20).fillColor('#111').text('Executive Summary', { underline: true }).moveDown(2);
      doc.fontSize(12).text(`This transparency report provides a comprehensive overview of Sovran Wealth Fund's financial position as of ${new Date().toLocaleDateString()}.`);
      doc.moveDown().text(`Total reserves across all tracked wallets: $${reservesData.totalUSD?.toLocaleString() || 0}`);
      doc.moveDown().text(`Number of tracked blockchain addresses: ${reservesData.reserves?.length || 0}`);
      
      // Proof of Reserves section
      doc.addPage();
      doc.fontSize(20).fillColor('#111').text('Proof of Reserves', { underline: true }).moveDown(2);
      doc.fontSize(12).text('All holdings are verifiable on-chain via the following addresses:').moveDown();
      
      if (reservesData.reserves && reservesData.reserves.length > 0) {
        reservesData.reserves.forEach((reserve, i) => {
          doc.fontSize(11).text(`${i + 1}. ${reserve.chain}: ${reserve.address}`);
          doc.text(`   Balance: ${reserve.balance} ${reserve.symbol} ($${reserve.usdValue?.toLocaleString() || 0})`).moveDown(0.5);
        });
      } else {
        doc.text('No reserves configured or available at this time.');
      }
      
    } catch (apiError) {
      console.error('Error fetching data for PDF:', apiError);
      doc.addPage();
      doc.fontSize(20).text('Data Unavailable');
      doc.fontSize(12).text('Unable to fetch current reserve data. Please try again later.');
    }
    
    // Add appendix
    addAppendix(doc);
    
    // Add watermark
    const watermarkText = email ? `Generated for ${email}` : code ? `Code: ${code}` : "Confidential • Sovran Wealth Fund";
    addWatermark(doc, watermarkText);
    
    // Add footer
    addFooter(doc);
    
    // Finalize PDF
    doc.end();
    
    // Log download and send notifications
    try {
      const logEntry = await logDownload(email, code, watermarkText);
      logEntry.ip = ip;
      logEntry.userAgent = userAgent;
      
      // Rate limited notifications
      const notifyKey = email || ip || 'default';
      if (shouldNotify(notifyKey)) {
        await Promise.allSettled([
          sendEmailNotification(logEntry),
          sendTelegramNotification(logEntry)
        ]);
      }
    } catch (notifyError) {
      console.error('Notification error:', notifyError);
    }
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
}