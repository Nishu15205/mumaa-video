// ============================================================
// MUMAA CSV Export Utility
// ============================================================

/**
 * Converts an array of objects to a CSV string.
 * @param data - Array of objects to convert
 * @param headers - Optional custom headers mapping (key -> display name)
 * @returns CSV string
 */
export function objectsToCsv(
  data: Record<string, unknown>[],
  headers?: Record<string, string>
): string {
  if (!data || data.length === 0) return '';

  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const displayHeaders = headers
    ? Object.values(headers)
    : keys;

  const escapeCsv = (val: unknown): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = displayHeaders.map(escapeCsv).join(',');

  const rows = data.map((item) =>
    keys.map((key) => escapeCsv(item[key])).join(',')
  );

  return [headerRow, ...rows].join('\n');
}

/**
 * Triggers a CSV file download in the browser.
 * @param csvString - The CSV content
 * @param filename - The download filename (without extension)
 */
export function downloadCsv(csvString: string, filename: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports an array of objects as a CSV file download.
 * @param data - Array of objects to export
 * @param filename - The download filename (without extension)
 * @param headers - Optional custom headers mapping
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>
): void {
  const csv = objectsToCsv(data, headers);
  if (csv) {
    downloadCsv(csv, filename);
  }
}
