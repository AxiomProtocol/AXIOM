export function addCoverPage(doc, logoPath) {
  doc.rect(0,0,doc.page.width,doc.page.height).fill("#4F46E5"); doc.fillColor("white");
  if(logoPath){try{doc.image(logoPath, doc.page.width/2-60, 80, {width:120});}catch{}}
  doc.fontSize(28).text("Sovran Wealth Fund",{align:"center"}).moveDown(2);
  doc.fontSize(20).text("Monthly Transparency Report",{align:"center"}).moveDown(2);
  doc.fontSize(14).text(`Generated on ${new Date().toLocaleDateString()}`,{align:"center"});
  doc.addPage();
}