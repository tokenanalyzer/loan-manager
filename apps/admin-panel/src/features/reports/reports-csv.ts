import { triggerDownload } from '../documents/documents-api';

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Generic client-generated CSV export for a report widget — same approach as `applications-csv.ts`. */
export function exportReportCsv(fileNamePrefix: string, header: string[], rows: string[][]): void {
  const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${fileNamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`);
}
