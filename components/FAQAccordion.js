import React, { useState } from "react";
export default function FAQAccordion({ faqs }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {faqs.map((f,i)=>(
        <div key={i} className="border rounded-lg shadow-sm">
          <button onClick={()=>setOpen(open===i?null:i)} className="w-full p-4 flex justify-between text-left">
            <span className="font-semibold text-lg">{f.question}</span><span>{open===i?"−":"+"}</span>
          </button>
          {open===i && <div className="px-4 pb-4 text-gray-700">{f.answer}</div>}
        </div>
      ))}
    </div>
  );
}