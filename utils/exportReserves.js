import { saveAs } from "file-saver";

function toCSVString(history) {
  if (!history || history.length === 0) return "";
  const headers = Object.keys(history[0]);
  const escape = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const rows = [
    headers.join(","),
    ...history.map((row) => headers.map((h) => escape(row[h])).join(","))
  ];
  return rows.join("\r\n");
}

export function exportToCSV(history) {
  const csv = toCSVString(history);
  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "reserves_history.csv");
}

export function exportToExcel(history) {
  const csv = toCSVString(history);
  saveAs(
    new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    "reserves_history.xlsx"
  );
}
