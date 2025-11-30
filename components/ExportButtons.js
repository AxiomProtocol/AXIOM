// components/ExportButtons.js
import React,{useEffect,useState} from "react";
import { exportToCSV, exportToExcel } from "../utils/exportReserves";
export default function ExportButtons({ fetchUrl }) {
  const [history,setHistory]=useState([]);
  useEffect(()=>{(async()=>{try{const r=await fetch(fetchUrl); const d=await r.json(); setHistory(d.history||[]);}catch(e){}})();},[fetchUrl]);
  if(history.length===0) return null;
  return (<div className="flex space-x-4 mt-6">
    <button onClick={()=>exportToCSV(history)} className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700">Download CSV</button>
    <button onClick={()=>exportToExcel(history)} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">Download Excel</button>
  </div>);
}