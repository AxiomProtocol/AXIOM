export function addWatermark(doc, text="Confidential • Sovran Wealth Fund"){
  const range=doc.bufferedPageRange();
  for(let i=range.start;i<range.start+range.count;i++){
    doc.switchToPage(i); const {width,height}=doc.page; doc.save();
    doc.rotate(-45,{origin:[width/2,height/2]}).fontSize(40).fillColor("lightgray").opacity(0.2)
      .text(text, width/2-250, height/2, {align:"center", width:500});
    doc.restore();
  }
}