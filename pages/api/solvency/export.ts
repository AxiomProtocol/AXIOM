import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';
import { pool } from '../../../server/db';

const NAVY = '#1a2744';
const GRAY = '#6b7280';
const LIGHT_GRAY = '#9ca3af';
const BORDER = '#d1d5db';

function fmtUsd(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRatio(value: number): string {
  return (value * 100).toFixed(2) + '%';
}

function fmtTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  } catch {
    return iso;
  }
}

async function fetchLatestSnapshot(): Promise<{
  payload: Record<string, any>;
  id: string;
  asOfUtc: string;
  checksum: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT id, as_of_utc, payload_json, checksum
       FROM solvency_snapshots
       ORDER BY created_at DESC
       LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      payload: typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json,
      id: row.id,
      asOfUtc: row.as_of_utc,
      checksum: row.checksum,
    };
  } catch {
    return null;
  }
}

async function fetchSnapshotById(snapshotId: string): Promise<{
  payload: Record<string, any>;
  id: string;
  asOfUtc: string;
  checksum: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT id, as_of_utc, payload_json, checksum FROM solvency_snapshots WHERE id = $1`,
      [snapshotId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      payload: typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json,
      id: row.id,
      asOfUtc: row.as_of_utc,
      checksum: row.checksum,
    };
  } catch {
    return null;
  }
}

async function fetchAmeData(): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM ame_evaluations ORDER BY created_at DESC LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return typeof row.result_json === 'string' ? JSON.parse(row.result_json) : row.result_json;
  } catch {
    return null;
  }
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(1.2);
  doc.fontSize(12).fillColor(NAVY).text(title.toUpperCase(), { characterSpacing: 1.5 });
  const y = doc.y + 2;
  doc.moveTo(72, y).lineTo(540, y).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.moveDown(0.6);
}

function drawMetricRow(doc: PDFKit.PDFDocument, label: string, value: string, x1: number, x2: number) {
  const y = doc.y;
  doc.fontSize(9).fillColor(GRAY).text(label, x1, y, { width: 150 });
  doc.fontSize(9).fillColor(NAVY).text(value, x2, y, { width: 180, align: 'right' });
  doc.y = y + 16;
}

function drawTableHeader(doc: PDFKit.PDFDocument, columns: { label: string; x: number; width: number; align?: string }[]) {
  const y = doc.y;
  doc.rect(72, y - 2, 468, 16).fillColor('#f3f4f6').fill();
  columns.forEach(col => {
    doc.fontSize(7).fillColor(LIGHT_GRAY).text(
      col.label.toUpperCase(),
      col.x,
      y,
      { width: col.width, align: (col.align as any) || 'left' }
    );
  });
  doc.y = y + 18;
}

function drawTableRow(doc: PDFKit.PDFDocument, cells: { text: string; x: number; width: number; align?: string; color?: string }[], alternate: boolean) {
  const y = doc.y;
  if (alternate) {
    doc.rect(72, y - 2, 468, 16).fillColor('#f9fafb').fill();
  }
  cells.forEach(cell => {
    doc.fontSize(8).fillColor(cell.color || NAVY).text(
      cell.text,
      cell.x,
      y,
      { width: cell.width, align: (cell.align as any) || 'left' }
    );
  });
  doc.y = y + 16;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { snapshotId } = req.query;
    const snapshot = snapshotId && typeof snapshotId === 'string' && snapshotId.length > 0
      ? await fetchSnapshotById(snapshotId)
      : await fetchLatestSnapshot();

    if (!snapshot) {
      return res.status(404).json({ error: 'No solvency snapshot available for export' });
    }

    const p = snapshot.payload;
    const ameData = await fetchAmeData();

    const treasuryTotalUsd = Math.round(Number(p.treasuryTotalUsd || 0) * 100) / 100;
    const treasuryLiquidUsd = Math.round(Number(p.treasuryLiquidUsd || 0) * 100) / 100;
    const reservesTotalUsd = Math.round(Number(p.reservesTotalUsd || 0) * 100) / 100;
    const liabilitiesTotalUsd = Math.round(Number(p.liabilitiesTotalUsd || 0) * 100) / 100;
    const lossBufferUsd = Math.round(Number(p.lossBufferUsd || 0) * 100) / 100;
    const policyMode = String(p.policyMode || 'BOOTSTRAP');

    const reserveRatio = liabilitiesTotalUsd > 0
      ? Math.round((reservesTotalUsd / liabilitiesTotalUsd) * 10000) / 10000
      : 0;
    const coverageRatio = liabilitiesTotalUsd > 0
      ? Math.round(((treasuryTotalUsd + reservesTotalUsd) / liabilitiesTotalUsd) * 10000) / 10000
      : 0;

    const snapshotAgeMs = Date.now() - new Date(snapshot.asOfUtc).getTime();
    const fmtAge = (ms: number): string => {
      const totalMinutes = Math.floor(ms / (1000 * 60));
      if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
      const hours = Math.floor(totalMinutes / 60);
      if (hours < 48) return `${hours} hour${hours !== 1 ? 's' : ''}`;
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    };
    const snapshotAgeStr = fmtAge(snapshotAgeMs);

    const now = new Date().toISOString();
    const filename = `axiom-solvency-${snapshot.id.slice(0, 8)}-${new Date(snapshot.asOfUtc).toISOString().slice(0, 10)}.pdf`;

    const doc = new PDFDocument({ size: 'LETTER', margin: 72 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfPromise = new Promise<void>((resolve, reject) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.status(200).end(buffer);
        resolve();
      });
      doc.on('error', (err) => {
        console.error('[solvency/export] PDF generation error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'PDF generation failed' });
        }
        reject(err);
      });
    });

    doc.fontSize(20).fillColor(NAVY).text('AXIOM PROTOCOL', { align: 'center', characterSpacing: 3 });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor(NAVY).text('Solvency and Reserve Transparency', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor(LIGHT_GRAY).text('Institutional Disclosure Snapshot', { align: 'center' });
    doc.moveDown(1.5);

    const headerY = doc.y;
    doc.rect(72, headerY - 4, 468, 60).strokeColor(BORDER).lineWidth(0.5).stroke();

    doc.fontSize(8).fillColor(GRAY);
    doc.text('Snapshot ID', 82, headerY + 4, { width: 100 });
    doc.text('Timestamp (UTC)', 82, headerY + 18, { width: 100 });
    doc.text('Snapshot Age', 82, headerY + 32, { width: 100 });

    doc.fontSize(8).fillColor(NAVY);
    doc.text(snapshot.id, 180, headerY + 4, { width: 180 });
    doc.text(fmtTimestamp(snapshot.asOfUtc), 180, headerY + 18, { width: 180 });
    doc.text(snapshotAgeStr, 180, headerY + 32, { width: 180 });

    doc.fontSize(8).fillColor(GRAY);
    doc.text('Checksum', 370, headerY + 4, { width: 80 });
    doc.text('Policy Mode', 370, headerY + 18, { width: 80 });
    doc.text('Export Generated', 370, headerY + 32, { width: 80 });

    doc.fontSize(8).fillColor(NAVY);
    doc.text(snapshot.checksum || 'N/A', 445, headerY + 4, { width: 90, align: 'right' });
    doc.text(policyMode, 445, headerY + 18, { width: 90, align: 'right' });
    doc.text(fmtTimestamp(now), 445, headerY + 32, { width: 90, align: 'right' });

    doc.y = headerY + 64;

    drawSectionTitle(doc, 'Primary Metrics');

    const col1x = 82;
    const col1v = 200;
    const col2x = 310;
    const col2v = 428;

    let y = doc.y;
    doc.fontSize(9).fillColor(GRAY).text('Treasury Total', col1x, y);
    doc.fontSize(9).fillColor(NAVY).text(fmtUsd(treasuryTotalUsd), col1v, y, { width: 100, align: 'right' });
    doc.fontSize(9).fillColor(GRAY).text('Reserve Ratio', col2x, y);
    doc.fontSize(9).fillColor(NAVY).text(fmtRatio(reserveRatio), col2v, y, { width: 100, align: 'right' });

    y += 18;
    doc.fontSize(9).fillColor(GRAY).text('Treasury Liquid', col1x, y);
    doc.fontSize(9).fillColor(NAVY).text(fmtUsd(treasuryLiquidUsd), col1v, y, { width: 100, align: 'right' });
    doc.fontSize(9).fillColor(GRAY).text('Coverage Ratio', col2x, y);
    doc.fontSize(9).fillColor(NAVY).text(fmtRatio(coverageRatio), col2v, y, { width: 100, align: 'right' });

    y += 18;
    doc.fontSize(9).fillColor(GRAY).text('Reserves Total', col1x, y);
    doc.fontSize(9).fillColor(NAVY).text(fmtUsd(reservesTotalUsd), col1v, y, { width: 100, align: 'right' });
    doc.fontSize(9).fillColor(GRAY).text('Loss Buffer', col2x, y);
    doc.fontSize(9).fillColor(NAVY).text(fmtUsd(lossBufferUsd), col2v, y, { width: 100, align: 'right' });

    y += 18;
    doc.fontSize(9).fillColor(GRAY).text('AXUSD Issued', col1x, y);
    doc.fontSize(9).fillColor(NAVY).text(fmtUsd(liabilitiesTotalUsd), col1v, y, { width: 100, align: 'right' });
    doc.fontSize(9).fillColor(GRAY).text('Policy Mode', col2x, y);
    doc.fontSize(9).fillColor(NAVY).text(policyMode, col2v, y, { width: 100, align: 'right' });

    doc.y = y + 24;

    if (ameData && ameData.regimeBand) {
      drawSectionTitle(doc, 'Adaptive Metrics Engine Status');

      y = doc.y;
      doc.fontSize(9).fillColor(GRAY).text('Regime Score (RS)', col1x, y);
      doc.fontSize(9).fillColor(NAVY).text(Number(ameData.rs || 0).toFixed(4), col1v, y, { width: 100, align: 'right' });
      doc.fontSize(9).fillColor(GRAY).text('Regime Band', col2x, y);
      doc.fontSize(9).fillColor(NAVY).text(ameData.regimeBand, col2v, y, { width: 100, align: 'right' });

      y += 18;
      doc.fontSize(9).fillColor(GRAY).text('Policy Multiplier (PM)', col1x, y);
      doc.fontSize(9).fillColor(NAVY).text(Number(ameData.pm || 0).toFixed(2), col1v, y, { width: 100, align: 'right' });
      doc.fontSize(9).fillColor(GRAY).text('Payout Factor (PF)', col2x, y);
      doc.fontSize(9).fillColor(NAVY).text(Number(ameData.payoutFactor || 0).toFixed(2), col2v, y, { width: 100, align: 'right' });

      doc.y = y + 24;

      if (ameData.ratios && ameData.targets) {
        const metrics = [
          { label: 'Coverage Ratio (CR)', actual: ameData.ratios.coverageRatio, target: ameData.targets.crTarget },
          { label: 'Reserve Ratio (RR)', actual: ameData.ratios.reserveRatio, target: ameData.targets.rrTarget },
          { label: 'Loss Buffer Ratio (LBR)', actual: ameData.ratios.lossBufferRatio, target: ameData.targets.lbrTarget },
          { label: 'Liquidity Depth (LD)', actual: ameData.ratios.liquidityDepth, target: ameData.targets.ldTarget },
        ];

        drawTableHeader(doc, [
          { label: 'Metric', x: 82, width: 160 },
          { label: 'Actual', x: 260, width: 80, align: 'right' },
          { label: 'Target', x: 350, width: 80, align: 'right' },
          { label: 'Status', x: 440, width: 90, align: 'right' },
        ]);

        metrics.forEach((m, i) => {
          const actual = Number(m.actual || 0);
          const target = Number(m.target || 0);
          const met = actual >= target;
          drawTableRow(doc, [
            { text: m.label, x: 82, width: 160 },
            { text: actual.toFixed(4), x: 260, width: 80, align: 'right' },
            { text: target.toFixed(4), x: 350, width: 80, align: 'right' },
            { text: met ? 'Met' : 'Breached', x: 440, width: 90, align: 'right', color: met ? '#166534' : '#dc2626' },
          ], i % 2 === 0);
        });
      }

      const rs = Number(ameData.rs || 0);
      const ratios = ameData.ratios || {};
      const targets = ameData.targets || {};

      drawSectionTitle(doc, 'Hard Brake Trigger Table');

      const triggers = [
        { trigger: 'CRISIS_LOCKDOWN', threshold: 'RS >= 0.80', current: rs.toFixed(4), breached: rs >= 0.80 },
        { trigger: 'FREEZE_DISTRIBUTIONS', threshold: `CR < ${Number(targets.crTarget || 0).toFixed(4)}`, current: Number(ratios.coverageRatio || 0).toFixed(4), breached: (ratios.coverageRatio || 0) < (targets.crTarget || 0) },
        { trigger: 'LIQUIDITY_DEFENSE', threshold: `LD < ${Number(targets.ldTarget || 0).toFixed(4)}`, current: Number(ratios.liquidityDepth || 0).toFixed(4), breached: (ratios.liquidityDepth || 0) < (targets.ldTarget || 0) },
        { trigger: 'REDIRECT_FLOWS', threshold: `RR < ${Number(targets.rrTarget || 0).toFixed(4)}`, current: Number(ratios.reserveRatio || 0).toFixed(4), breached: (ratios.reserveRatio || 0) < (targets.rrTarget || 0) },
      ];

      drawTableHeader(doc, [
        { label: 'Trigger', x: 82, width: 140 },
        { label: 'Threshold', x: 230, width: 100, align: 'right' },
        { label: 'Current', x: 340, width: 80, align: 'right' },
        { label: 'Breached', x: 430, width: 100, align: 'right' },
      ]);

      triggers.forEach((t, i) => {
        drawTableRow(doc, [
          { text: t.trigger, x: 82, width: 140 },
          { text: t.threshold, x: 230, width: 100, align: 'right' },
          { text: t.current, x: 340, width: 80, align: 'right' },
          { text: t.breached ? 'YES' : 'NO', x: 430, width: 100, align: 'right', color: t.breached ? '#dc2626' : '#166534' },
        ], i % 2 === 0);
      });
    }

    const composition = Array.isArray(p.composition) ? p.composition : [];
    if (composition.length > 0) {
      drawSectionTitle(doc, 'Composition');

      drawTableHeader(doc, [
        { label: 'Asset', x: 82, width: 200 },
        { label: 'Value (USD)', x: 300, width: 100, align: 'right' },
        { label: 'Allocation', x: 420, width: 110, align: 'right' },
      ]);

      composition.forEach((item: any, i: number) => {
        drawTableRow(doc, [
          { text: item.label || 'Unknown', x: 82, width: 200 },
          { text: fmtUsd(Number(item.valueUsd || 0)), x: 300, width: 100, align: 'right' },
          { text: `${Number(item.pct || 0).toFixed(2)}%`, x: 420, width: 110, align: 'right' },
        ], i % 2 === 0);
      });
    }

    drawSectionTitle(doc, 'Key Contract Addresses');

    const contracts = [
      { label: 'Unified AXUSD (ERC-3643)', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7' },
      { label: 'PSM (USDC)', address: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922' },
      { label: 'PSM (USDT)', address: '0x4584888cB411E9cc88e3800BAB73A430D90d3793' },
      { label: 'Treasury Hub', address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929' },
    ];

    contracts.forEach(c => {
      y = doc.y;
      doc.fontSize(8).fillColor(GRAY).text(c.label, 82, y, { width: 100 });
      doc.fontSize(7).fillColor(NAVY).text(c.address, 180, y, { width: 350 });
      doc.y = y + 14;
    });

    if (doc.y > 600) {
      doc.addPage();
    }

    drawSectionTitle(doc, 'Risk Disclosure');

    doc.fontSize(7).fillColor(GRAY).text(
      'This document is provided for informational and transparency purposes only. It does not constitute an offer, solicitation, or recommendation to participate in any protocol activity. All solvency data is derived from controlled reconciliation snapshots subject to temporal variance and may not reflect real-time conditions. Reserve ratios, coverage ratios, and capital positions are subject to change between disclosure cycles. Participation in the Axiom Protocol involves material risk including total loss of contributed capital. The loss buffer and reserve designations are structural mechanisms and do not constitute insurance, guarantees, or warranties of any kind. Past performance and historical coverage ratios are not indicative of future results. Participants should consult qualified legal, financial, and tax advisors.',
      82,
      doc.y,
      { width: 446, align: 'justify', lineGap: 2 }
    );

    doc.moveDown(2);

    const footerY = doc.y;
    doc.moveTo(72, footerY).lineTo(540, footerY).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.moveDown(0.5);

    doc.fontSize(7).fillColor(LIGHT_GRAY);
    doc.text(`Snapshot Reference: ${snapshot.id}`, 72, doc.y, { width: 300 });
    doc.text(`Checksum: ${snapshot.checksum || 'N/A'}`, 72, doc.y);
    doc.moveDown(0.5);
    doc.text(`Verification: Compare this checksum against protocol snapshot records to confirm data integrity. This document reflects the exact values computed from the referenced snapshot at the time of export.`);
    doc.moveDown(0.3);
    doc.text(`Generated: ${fmtTimestamp(now)} | Axiom Protocol | arbiscan.io`);

    doc.end();
    await pdfPromise;
  } catch (error: any) {
    console.error('[solvency/export] Error:', error);
    return res.status(500).json({ error: 'Failed to generate PDF export' });
  }
}
