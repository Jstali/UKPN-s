import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToCSV = (data, columns, filename) => {
  const headers = columns.map(col => col.label).join(',');
  const rows = data.map(row =>
    columns.map(col => `"${row[col.key] || ''}"`).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToPDF = (data, columns, filename) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const headers = columns.map(col => col.label);
  const rows = data.map(row =>
    columns.map(col => String(row[col.key] ?? ''))
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 20,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [76, 78, 189], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 20, left: 10, right: 10 },
    didDrawPage: () => {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('DTC Audit Report', 14, 14);
    },
  });

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = (data, columns, filename) => {
  const wsData = [
    columns.map(col => col.label),
    ...data.map(row => columns.map(col => row[col.key] ?? ''))
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns
  ws['!cols'] = columns.map((col, i) => {
    const maxLen = Math.max(
      col.label.length,
      ...data.map(row => String(row[col.key] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Data');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
