export function addAppendix(doc){
  doc.addPage(); doc.fontSize(20).fillColor("#111").text("Appendix",{underline:true}).moveDown(2);
  doc.fontSize(16).text("Disclaimers",{underline:true}).moveDown(0.5);
  doc.fontSize(12).fillColor("gray").text("This Transparency Report is informational only and not investment advice. Values may change.");
  doc.moveDown(2); doc.fontSize(16).fillColor("#111").text("Methodology",{underline:true}).moveDown(0.5);
  doc.fontSize(12).text("Reserves are aggregated from Sovran-controlled wallets via chain explorers and priced using CoinGecko spot rates. Daily snapshots stored for history.");
  doc.moveDown(2); doc.fontSize(16).text("Definitions",{underline:true}).moveDown(0.5);
  doc.fontSize(12).list([
    "Proof of Reserves: Verifiable on-chain holdings for Sovran wallets.",
    "Cumulative Growth: % change from initial snapshot to current total.",
    "Total USD Reserves: Sum of tracked wallets converted to USD."
  ]);
}