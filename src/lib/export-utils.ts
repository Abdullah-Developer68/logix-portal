import * as XLSX from "xlsx";
import jsPDF from "jspdf";

type Cell = string | number | undefined | null;

export function exportToExcelCsv(
  filename: string,
  headers: string[],
  rows: Cell[][],
) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx")
      ? filename
      : `${filename.replace(/\.csv$/i, "")}.xlsx`,
  );
}

export function downloadSampleImportCsv() {
  exportToExcelCsv(
    "logix_interns_bulk_import_template.xlsx",
    [
      "fullName",
      "fatherName",
      "cnic",
      "email",
      "phone",
      "city",
      "university",
      "degree",
      "semester",
      "cgpa",
      "field",
      "durationMonths",
      "startDate",
      "status",
    ],
    [
      [
        "Zain Ul Abideen",
        "Tariq Mehmood",
        "35202-8819201-1",
        "zain.abideen@lums.edu.pk",
        "+92 300 9918273",
        "Lahore",
        "LUMS",
        "BS Computer Science",
        "7th Semester",
        "3.82",
        "Web Development",
        "3",
        "2026-11-01",
        "Active",
      ],
    ],
  );
}

export function parseCsvText(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitRow = (line: string) => {
    const values: string[] = [];
    let value = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        values.push(value.trim());
        value = "";
      } else value += char;
    }
    values.push(value.trim());
    return values;
  };

  const headers = splitRow(lines[0].replace(/^\uFEFF/, ""));
  return lines.slice(1).map((line) => {
    const values = splitRow(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

export function exportReportToPdf(params: {
  title: string;
  subtitle: string;
  summaryMetrics?: Array<{ label: string; value: string | number }>;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const margin = 32;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const columnWidth = (pageWidth - margin * 2) / params.headers.length;
  let y = margin;

  pdf.setTextColor("#0b1f3a");
  pdf.setFontSize(18);
  pdf.text("Logix Internship Management Portal", margin, y);
  y += 22;
  pdf.setFontSize(14);
  pdf.text(params.title, margin, y);
  y += 16;
  pdf.setFontSize(9);
  pdf.setTextColor("#5b6b84");
  pdf.text(params.subtitle, margin, y);
  y += 22;

  if (params.summaryMetrics?.length) {
    pdf.setTextColor("#0b1f3a");
    params.summaryMetrics.forEach((metric, index) => {
      pdf.text(
        `${metric.label}: ${metric.value}`,
        margin + index * ((pageWidth - margin * 2) / params.summaryMetrics!.length),
        y,
      );
    });
    y += 18;
  }

  const drawHeader = () => {
    params.headers.forEach((header, index) => {
      pdf.setFillColor("#0b1f3a");
      pdf.rect(margin + index * columnWidth, y - 9, columnWidth, 16, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFontSize(7);
      pdf.text(String(header).slice(0, 28), margin + index * columnWidth + 4, y);
    });
    y += 18;
  };

  drawHeader();
  params.rows.forEach((row) => {
    if (y > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      drawHeader();
    }
    row.forEach((cell, index) => {
      pdf.setTextColor("#0b1f3a");
      pdf.setFontSize(7);
      pdf.text(String(cell ?? "").slice(0, 34), margin + index * columnWidth + 4, y);
    });
    y += 14;
  });

  pdf.save(`${params.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`);
}
