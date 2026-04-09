import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Generate filename with timestamp
const generateFilename = (baseFilename) => {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-mm-ss
  return `${baseFilename}_${date}_${time}`;
};

export const exportToCSV = (data, columns, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }
    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(row =>
      columns.map(col => `"${String(row[col.key] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generateFilename(filename)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('CSV export failed:', err);
    alert('Failed to export CSV. Please try again.');
  }
};

export const exportToPDF = (data, columns, filename, title, options = {}) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }
    const reportTitle = title || filename?.replace(/_/g, ' ') || 'Audit Report';
    const {
      orientation = 'landscape',
      pageFormat = 'a4',
      fontSize = 6,
      overflow = 'linebreak',
      horizontalPageBreak = false,
      horizontalPageBreakRepeat = undefined,
      repeatHeaderEveryPage = true,
      minCellWidth = undefined,
      cellPadding = 2,
    } = options;

    const doc = new jsPDF({ orientation, unit: 'mm', format: pageFormat });

    const headers = columns.map(col => col.label);
    const rows = data.map(row =>
      columns.map(col => String(row[col.key] ?? ''))
    );

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 20,
      styles: { fontSize, cellPadding, overflow, minCellWidth, valign: 'middle' },
      headStyles: {
        fillColor: [76, 78, 189],
        textColor: 255,
        fontStyle: 'bold',
        overflow,
        halign: 'left',
      },
      horizontalPageBreak,
      horizontalPageBreakRepeat,
      showHead: repeatHeaderEveryPage ? 'everyPage' : 'firstPage',
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 20, left: 10, right: 10 },
      didDrawPage: () => {
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(reportTitle, 14, 14);
      },
    });

    doc.save(`${generateFilename(filename)}.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
    alert('Failed to export PDF. Please try again.');
  }
};

export const exportToExcel = (data, columns, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }
    const wsData = [
      columns.map(col => col.label),
      ...data.map(row => columns.map(col => row[col.key] ?? ''))
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = columns.map((col) => {
      const maxLen = Math.max(
        col.label.length,
        ...data.map(row => String(row[col.key] ?? '').length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Data');
    XLSX.writeFile(wb, `${generateFilename(filename)}.xlsx`);
  } catch (err) {
    console.error('Excel export failed:', err);
    alert('Failed to export Excel. Please try again.');
  }
};
