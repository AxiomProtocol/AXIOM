export function addTableOfContents(doc, sections) {
  doc.addPage(); doc.fillColor("#111").fontSize(20).text("Table of Contents",{underline:true}).moveDown(2);
  sections.forEach((s,i)=>{ doc.fontSize(14).fillColor("blue").text(`${i+1}. ${s.title}`); doc.moveDown(0.5); });
}