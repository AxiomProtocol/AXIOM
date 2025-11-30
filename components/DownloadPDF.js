// components/DownloadPDF.js
import React from "react";
export default function DownloadPDF({ email, code }) {
  const qp=new URLSearchParams(); if(email) qp.append("email",email); if(code) qp.append("code",code);
  return (<a href={`/api/reports/generate-pdf?${qp.toString()}`} className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700" download>
    Download Monthly PDF Report
  </a>);
}