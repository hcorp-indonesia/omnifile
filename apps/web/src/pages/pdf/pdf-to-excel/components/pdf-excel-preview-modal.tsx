import {
  type ExcelConversionResult,
  type SheetPreview,
  downloadEditedExcelFile,
} from "@/lib/pdf-excel-api";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface PdfExcelPreviewModalProps {
  result: ExcelConversionResult | null;
  onClose: () => void;
}

export function PdfExcelPreviewModal({
  result,
  onClose,
}: PdfExcelPreviewModalProps) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [editedSheets, setEditedSheets] = useState<SheetPreview[]>([]);

  const sheets = editedSheets.length > 0 ? editedSheets : result?.sheets || [];
  const currentSheet = sheets[activeSheetIndex] || {
    sheet_name: "Page 1",
    page_number: 1,
    row_count: 0,
    column_count: 0,
    rows: [],
  };

  const maxColumns = Math.max(
    currentSheet.column_count,
    ...currentSheet.rows.map((r) => r.length),
    1,
  );

  const headerRow = currentSheet.rows[0] || [];
  const dataRows = currentSheet.rows.slice(1);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return dataRows;
    const query = searchQuery.toLowerCase();
    return dataRows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(query)),
    );
  }, [dataRows, searchQuery]);

  useEffect(() => {
    setActiveSheetIndex(0);
    setSearchQuery("");
    setEditedSheets(
      (result?.sheets || []).map((sheet) => ({
        ...sheet,
        rows: sheet.rows.map((row) => [...row]),
      })),
    );
  }, [result?.file_name]);

  if (!result) return null;

  const handleCopyCsv = () => {
    if (!currentSheet.rows || currentSheet.rows.length === 0) return;
    const csvContent = currentSheet.rows
      .map((row) =>
        row
          .map((cell) => {
            const escaped = cell.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(","),
      )
      .join("\n");

    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    toast.success(
      `Sheet "${currentSheet.sheet_name}" copied as CSV to clipboard!`,
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    setEditedSheets((current) =>
      current.map((sheet, sheetIndex) => {
        if (sheetIndex !== activeSheetIndex) return sheet;
        const rows = sheet.rows.map((row) => [...row]);
        while (rows[rowIndex].length <= columnIndex) rows[rowIndex].push("");
        rows[rowIndex][columnIndex] = value;
        return { ...sheet, rows };
      }),
    );
  };

  return (
    <div
      className={cn(
        "fixed",
        "inset-0",
        "z-50",
        "flex",
        "items-center",
        "justify-center",
        "p-3",
        "sm:p-6",
        "bg-black/80",
        "backdrop-blur-xs",
    
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative",
          "w-full",
          "max-w-5xl",
          "h-[90vh]",
          "min-h-0",
          "flex",
          "flex-col",
          "rounded-3xl",
          "bg-white",
          "dark:bg-[#16181d]",
          "border-3",
          "border-gray-900",
          "dark:border-gray-700",
          "shadow-[8px_8px_0_0_#111827]",
          "overflow-hidden",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={cn(
            "flex",
            "flex-wrap",
            "items-center",
            "justify-between",
            "gap-3",
            "px-4",
            "py-2",
            "border-b-3",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-emerald-400",
            "dark:bg-emerald-700",
          )}
        >
          <div className={cn("flex", "items-center", "gap-3")}>
            <div
              className={cn(
                "flex",
                "items-center",
                "justify-center",
                "w-10",
                "h-10",
                "rounded-xl",
                "bg-white",
                "dark:bg-[#16181d]",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "shadow-[2px_2px_0_0_#111827]",
              )}
            >
              <FileSpreadsheet
                className={cn(
                  "w-6",
                  "h-6",
                  "text-emerald-700",
                  "dark:text-emerald-400",
                )}
              />
            </div>
            <div>
              <div className={cn("flex", "items-center", "gap-2")}>
                <h3
                  className={cn(
                    "font-black",
                    "text-lg",
                    "text-black",
                    "dark:text-white",
                    "truncate",
                    "max-w-md",
                  )}
                >
                  {result.file_name}
                </h3>
              </div>
              <p
                className={cn(
                  "text-xs",
                  "font-bold",
                  "text-zinc-800",
                  "dark:text-zinc-200",
                )}
              >
                {result.total_sheets}{" "}
                {result.total_sheets === 1 ? "Sheet" : "Sheets"} •{" "}
                {result.total_rows} Total Rows
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={cn(
              "flex",
              "items-center",
              "justify-center",
              "w-8",
              "h-8",
              "rounded-xl",
              "bg-white",
              "dark:bg-[#16181d]",
              "hover:bg-red-400",
              "hover:text-black",
              "text-black",
              "dark:text-white",
              "border-2",
              "border-gray-900",
              "dark:border-gray-700",
              "shadow-[2px_2px_0_0_#111827]",
              "transition-all",
              "active:translate-x-0.5",
              "active:translate-y-0.5",
                  "cursor-pointer",
            )}
          >
            <X className={cn("w-5", "h-5")} />
          </button>
        </div>

        {/* Sheet Tabs & Search Bar */}
        <div
          className={cn(
            "flex",
            "flex-wrap",
            "items-center",
            "justify-between",
            "gap-3",
            "px-4",
            "py-2",
            "bg-zinc-100",
            "dark:bg-[#121316]",
            "border-b-2",
            "border-gray-200",
            "dark:border-gray-800",
          )}
        >
          {/* Sheets Navigation */}
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <div className={cn("relative", "w-full", "sm:w-64")}>
              <Search
                className={cn(
                  "absolute",
                  "left-2.5",
                  "top-1/2",
                  "-translate-y-1/2",
                  "w-4",
                  "h-4",
                  "text-zinc-400",
                )}
              />
              <input
                type="text"
                placeholder="Search in table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full",
                  "pl-9",
                  "pr-3",
                  "py-1.5",
                  "text-xs",
                  "font-bold",
                  "bg-white",
                  "dark:bg-zinc-900",
                  "border-2",
                  "rounded-xl",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "outline-none",
                  "focus:ring-2",
                  "focus:ring-emerald-400",
                )}
              />
            </div>
          </div>
        </div>

        {/* Spreadsheet Table Viewport */}
        <div
          className={cn(
            "min-h-0",
            "flex-1",
            "overflow-auto",
            "p-4",
            "bg-gray-200/80",
            "dark:bg-[#0d0e12]",
          )}
        >
          {filteredRows.length === 0 ? (
            <div
              className={cn(
                "flex",
                "flex-col",
                "items-center",
                "justify-center",
                "p-12",
                "text-center",
              )}
            >
              <FileSpreadsheet
                className={cn("w-12", "h-12", "text-zinc-400", "mb-2")}
              />
              <p
                className={cn(
                  "font-bold",
                  "text-sm",
                  "text-zinc-600",
                  "dark:text-zinc-400",
                )}
              >
                {searchQuery
                  ? "No matching rows found in this sheet"
                  : "No data in this sheet"}
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "inline-block",
                "min-w-full",
                "align-middle",
                "border",
                "border-gray-300",
                "bg-white",
                "shadow-md",
                "dark:border-gray-700",
                "dark:bg-[#16181d]",
              )}
            >
              <table
                className={cn(
                  "w-full",
                  "border-collapse",
                  "text-left",
                  "text-xs",
                )}
              >
                <thead>
                  <tr
                    className={cn(
                      "bg-[#29358f]",
                      "dark:bg-[#29358f]",
                      "border-b-2",
                      "border-black",
                      "dark:border-white",
                      "sticky",
                      "top-0",
                      "z-10",
                    )}
                  >
                    <th
                      className={cn(
                        "p-2",
                        "w-12",
                        "text-center",
                        "font-black",
                        "border-r-2",
                        "border-black",
                        "dark:border-white",
                        "bg-[#29358f]",
                        "dark:bg-[#29358f]",
                        "text-white",
                      )}
                    >
                      #
                    </th>
                    {Array.from({ length: maxColumns }).map((_, cIdx) => (
                      <th
                        key={cIdx}
                        className={cn(
                          "p-2",
                          "font-black",
                          "text-white",
                          "border-r-2",
                          "border-black",
                          "dark:border-white",
                          "whitespace-nowrap",
                          "min-w-30",
                        )}
                      >
                        {headerRow[cIdx] || ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody
                  className={cn(
                    "divide-y",
                    "divide-zinc-200",
                    "dark:divide-zinc-800",
                  )}
                >
                  {filteredRows.map((row, rIdx) => {
                    return (
                      <tr
                        key={rIdx}
                        className={cn(
                          "transition-colors",
                          rIdx % 2 === 0
                              ? "bg-white dark:bg-zinc-900"
                              : "bg-zinc-100/70 dark:bg-zinc-900/60",
                          "hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30",
                        )}
                      >
                        <td
                          className={cn(
                            "p-2",
                            "text-center",
                            "font-mono",
                            "font-black",
                            "text-zinc-500",
                            "dark:text-zinc-400",
                            "border-r-2",
                            "border-black",
                            "dark:border-white",
                            "bg-zinc-150",
                            "dark:bg-zinc-850",
                            "select-none",
                          )}
                        >
                          {rIdx + 2}
                        </td>
                        {Array.from({ length: maxColumns }).map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className={cn(
                              "p-2",
                              "border-r",
                              "border-zinc-300",
                              "dark:border-zinc-800",
                              "whitespace-pre-wrap",
                              "wrap-break-word",
                              "max-w-xs",
                              "text-zinc-800",
                              "dark:text-zinc-200",
                              "font-medium",
                            )}
                          >
                            <input
                              value={row[cIdx] || ""}
                              onChange={(event) => updateCell(rIdx + 1, cIdx, event.target.value)}
                              className={cn("w-full", "min-w-24", "bg-transparent", "outline-none", "text-inherit")}
                              aria-label={`${headerRow[cIdx] || "Column"} row ${rIdx + 2}`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={cn(
            "flex",
            "flex-wrap",
            "items-center",
            "justify-between",
            "gap-3",
            "px-5",
            "py-3",
            "border-t-3",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-white",
            "dark:bg-[#16181d]",
          )}
        >
          <div
            className={cn(
              "text-xs",
              "font-bold",
              "text-zinc-600",
              "dark:text-zinc-400",
            )}
          >
            Showing {filteredRows.length} of {currentSheet.row_count} rows in{" "}
            {currentSheet.sheet_name}
          </div>

          <div className={cn("flex", "items-center", "gap-3")}>
            <button
              type="button"
              onClick={handleCopyCsv}
              className={cn(
                "inline-flex",
                "items-center",
                "gap-2",
                "h-9",
                "px-3",
                "rounded-xl",
                "text-xs",
                "font-black",
                "bg-zinc-200",
                "dark:bg-zinc-800",
                "hover:bg-zinc-300",
                "dark:hover:bg-zinc-700",
                "text-black",
                "dark:text-white",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "shadow-[2px_2px_0_0_#111827]",
                "transition-all",
                "active:translate-x-0.5",
                "active:translate-y-0.5",
                "cursor-pointer"
              )}
            >
              {copied ? (
                <Check className={cn("w-4", "h-4", "text-emerald-600")} />
              ) : (
                <Copy className={cn("w-4", "h-4")} />
              )}
              {copied ? "Copied CSV" : "Copy CSV"}
            </button>

            <button
              type="button"
              onClick={() => downloadEditedExcelFile(editedSheets, result.file_name)}
              className={cn(
                "inline-flex",
                "items-center",
                "gap-2",
                "h-9",
                "px-4",
                "rounded-xl",
                "text-xs",
                "font-black",
                "bg-emerald-400",
                "hover:bg-emerald-300",
                "text-black",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "shadow-[2px_2px_0_0_#111827]",
                "transition-all",
                "active:translate-x-0.5",
                "active:translate-y-0.5",
                "cursor-pointer",
              )}
            >
              <Download className={cn("w-4", "h-4")} />
              Download .xlsx
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
