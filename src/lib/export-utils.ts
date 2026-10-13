export function exportToExcelCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | undefined | null>>,
) {
  const escapeCell = (val: string | number | undefined | null) => {
    const str = val == null ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(","),
    ...rows.map((r) => r.map(escapeCell).join(",")),
  ];

  // Include UTF-8 BOM so Microsoft Excel opens columns and characters properly
  const csvContent = "\uFEFF" + csvLines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleImportCsv() {
  const headers = [
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
  ];
  const sampleRows = [
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
    [
      "Hira Salman",
      "Salman Ahmad",
      "42101-7719283-4",
      "hira.salman@ned.edu.pk",
      "+92 331 5519204",
      "Karachi",
      "NED University",
      "BE Software Engineering",
      "6th Semester",
      "3.74",
      "AI / Machine Learning",
      "3",
      "2026-11-01",
      "Active",
    ],
  ];
  exportToExcelCsv("logix_interns_bulk_import_template.csv", headers, sampleRows);
}

export function parseCsvText(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const headers = splitRow(lines[0].replace(/^\uFEFF/, ""));
  const result: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    result.push(obj);
  }
  return result;
}

export function exportReportToPdf(params: {
  title: string;
  subtitle: string;
  summaryMetrics?: Array<{ label: string; value: string | number }>;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  const win = window.open("", "_blank", "width=1050,height=800");
  if (!win) {
    window.print();
    return;
  }

  const metricsHtml = params.summaryMetrics
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:20px 0;">
        ${params.summaryMetrics
          .map(
            (m) => `
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;background:#f4f6fa;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#5b6b84;">${m.label}</div>
            <div style="font-size:20px;font-weight:700;color:#0b1f3a;margin-top:4px;">${m.value}</div>
          </div>`,
          )
          .join("")}
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${params.title} — Logix Portal PDF Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0b1f3a;
      margin: 0;
      padding: 32px;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0b1f3a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand span { color: #1fc8aa; }
    .eyebrow {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #0e9983;
    }
    h1 {
      font-size: 24px;
      margin: 4px 0;
    }
    .subtitle {
      font-size: 13px;
      color: #5b6b84;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 12px;
    }
    th {
      background: #0b1f3a;
      color: #ffffff;
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #5b6b84;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="eyebrow">LOGIX INTERNSHIP MANAGEMENT PORTAL</div>
      <h1>${params.title}</h1>
      <div class="subtitle">${params.subtitle}</div>
    </div>
    <div style="text-align:right;">
      <div class="brand">LOG<span>IX</span></div>
      <div style="font-size:11px;color:#5b6b84;margin-top:4px;">Generated: ${new Date().toISOString().slice(0, 10)}</div>
    </div>
  </div>
  ${metricsHtml}
  <table>
    <thead>
      <tr>
        ${params.headers.map((h) => `<th>${h}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${params.rows
        .map(
          (r) =>
            `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`,
        )
        .join("")}
    </tbody>
  </table>
  <div class="footer">
    <span>© 2026 Logix Technologies Inc. — Confidential Internal Report</span>
    <span>Total Records: ${params.rows.length}</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

