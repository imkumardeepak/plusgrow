import * as XLSX from "xlsx";
import { format } from "date-fns";

/** Column definition for export */
export interface ExcelColumn<T> {
  /** Header label displayed in the Excel header row */
  header: string;
  /** Function to extract the cell value from a row */
  accessor: (row: T) => string | number | boolean | null | undefined;
  /** Column width in characters (default: auto-calculated) */
  width?: number;
  /** Format type hint for styling */
  format?: "text" | "number" | "currency" | "date";
}

/** Configuration for a single sheet */
export interface ExcelSheetConfig<T> {
  /** Sheet name (max 31 chars, no special chars) */
  sheetName: string;
  /** Data rows */
  data: T[];
  /** Column definitions */
  columns: ExcelColumn<T>[];
}

/** Configuration for the full export */
export interface ExcelExportConfig {
  /** File name (without extension) */
  fileName: string;
  /** One or more sheet configurations */
  sheets: ExcelSheetConfig<any>[];
}

/**
 * Style constants for a polished Excel look.
 * Note: xlsx (community) doesn't support full cell styling
 * but we maximise what we can: column widths, freeze panes, auto-filter.
 */

function sanitizeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no  \ / ? * [ ]
  return name.replace(/[\\/?*[\]]/g, "").slice(0, 31);
}

function calculateColumnWidth(
  header: string,
  values: (string | number | boolean | null | undefined)[],
  formatType?: string,
): number {
  const headerLen = header.length;
  let maxDataLen = 0;

  for (const val of values) {
    if (val == null) continue;
    const str = String(val);
    if (str.length > maxDataLen) {
      maxDataLen = str.length;
    }
  }

  // Add padding and clamp
  const base = Math.max(headerLen, maxDataLen) + 3;
  const min = 10;
  const max = formatType === "currency" ? 18 : 50;
  return Math.max(min, Math.min(base, max));
}

function buildSheet<T>(config: ExcelSheetConfig<T>): XLSX.WorkSheet {
  const { data, columns } = config;

  // Build header row + data rows
  const rows: (string | number | boolean | null | undefined)[][] = [];

  // Header row
  rows.push(columns.map((col) => col.header));

  // Data rows
  for (const row of data) {
    rows.push(columns.map((col) => col.accessor(row)));
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = columns.map((col, colIndex) => {
    if (col.width) return { wch: col.width };

    const values = data.map((row) => col.accessor(row));
    return { wch: calculateColumnWidth(col.header, values, col.format) };
  });

  // Freeze top row (header)
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

  // Auto-filter across all columns
  const lastCol = XLSX.utils.encode_col(columns.length - 1);
  const lastRow = data.length + 1; // +1 for header
  ws["!autofilter"] = { ref: `A1:${lastCol}${lastRow}` };

  return ws;
}

/**
 * Export data to a styled Excel file with multiple sheet support.
 *
 * Features:
 * - Auto-sized column widths based on content
 * - Frozen header row
 * - Auto-filter on all columns
 * - Timestamp in filename
 * - Multi-sheet support
 */
export function exportToExcel(config: ExcelExportConfig): void {
  const wb = XLSX.utils.book_new();

  for (const sheetConfig of config.sheets) {
    const ws = buildSheet(sheetConfig);
    const name = sanitizeSheetName(sheetConfig.sheetName);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const timestamp = format(new Date(), "yyyy-MM-dd");
  const fileName = `${config.fileName}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Helper to format a date string for Excel export
 */
export function formatExcelDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

/**
 * Helper to format a number for Excel export
 */
export function formatExcelNumber(value?: number | null, decimals = 2): number | string {
  if (value == null) return "";
  return Number(Number(value).toFixed(decimals));
}
