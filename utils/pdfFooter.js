export function addFooter(doc){
  const range=doc.bufferedPageRange();
  for(let i=range.start;i<range.start+range.count;i++){
    doc.switchToPage(i); const n=i+1; doc.fontSize(9).fillColor("gray");
    doc.text("Sovran Wealth Fund Transparency Report",50,doc.page.height-40,{align:"left"});
    doc.text(`Page ${n}`,-50,doc.page.height-40,{align:"right"});
  }
}