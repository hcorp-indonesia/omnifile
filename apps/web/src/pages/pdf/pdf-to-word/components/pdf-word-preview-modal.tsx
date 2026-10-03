import {
  downloadWordFile,
  extractAllTextFromPreviews,
  type WordFileResult,
} from "@/lib/pdf-word-api";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Download,
  FileText,
  Search,
  Table as TableIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface PdfWordPreviewModalProps {
  result: WordFileResult | null;
  onClose: () => void;
}

export function PdfWordPreviewModal({
  result,
  onClose,
}: PdfWordPreviewModalProps) {
  const [selectedPage, setSelectedPage] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedPage("all");
    setSearchQuery("");
    setCopied(false);
  }, [result?.file_name]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const previews = useMemo(() => result?.previews || [], [result]);

  const pages = useMemo(() => {
    const set = new Set<number>();
    for (const p of previews) {
      if (p.page) set.add(p.page);
    }
    if (set.size === 0 && result?.total_pages) {
      for (let i = 1; i <= result.total_pages; i++) set.add(i);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [previews, result?.total_pages]);

  const filteredPreviews = useMemo(() => {
    let list = previews;
    if (selectedPage !== "all") {
      list = list.filter((p) => p.page === selectedPage);
    }
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((p) => {
      if (p.text && p.text.toLowerCase().includes(q)) return true;
      if (p.table_data) {
        return p.table_data.some((row) =>
          row.some((cell) => cell.toLowerCase().includes(q)),
        );
      }
      return false;
    });
  }, [previews, selectedPage, searchQuery]);

  if (!result) return null;

  const handleCopyText = async () => {
    const textToCopy =
      selectedPage === "all"
        ? extractAllTextFromPreviews(previews)
        : extractAllTextFromPreviews(
            previews.filter((p) => p.page === selectedPage),
          );

    if (!textToCopy.trim()) {
      toast.info("No text available to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(
        selectedPage === "all"
          ? "Full document text copied to clipboard!"
          : `Page ${selectedPage} text copied!`,
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text to clipboard");
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
    );
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className={cn(
            "bg-yellow-300",
            "dark:bg-yellow-500/60",
            "rounded",
            "px-0.5",
            "font-bold",
            "text-gray-950",
          )}
        >
          {part}
        </mark>
      ) : (
        part
      ),
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
        "bg-black/60",
        "backdrop-blur-sm",
        "animate-in",
        "fade-in",
        "duration-200",
      )}
    >
      <div
        className={cn(
          "relative",
          "flex",
          "flex-col",
          "w-full",
          "max-w-5xl",
          "h-[92vh]",
          "rounded-3xl",
          "border-3",
          "border-gray-900",
          "dark:border-gray-700",
          "bg-white",
          "dark:bg-[#14161d]",
          "shadow-[8px_8px_0_0_#111827]",
          "dark:shadow-[8px_8px_0_0_#000]",
          "overflow-hidden",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex",
            "flex-col",
            "sm:flex-row",
            "sm:items-center",
            "justify-between",
            "gap-4",
            "p-4",
            "sm:p-5",
            "border-b-2",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-gray-50",
            "dark:bg-[#1a1c24]",
          )}
        >
          <div className={cn("flex", "items-center", "gap-3", "min-w-0")}>
            <div
              className={cn(
                "flex",
                "h-11",
                "w-11",
                "shrink-0",
                "items-center",
                "justify-center",
                "rounded-2xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-blue-400",
                "text-gray-900",
                "shadow-[2px_2px_0_0_#111827]",
              )}
            >
              <FileText className={cn("h-6", "w-6")} />
            </div>
            <div className="min-w-0">
              <h2
                className={cn(
                  "text-base",
                  "sm:text-lg",
                  "font-black",
                  "text-gray-900",
                  "dark:text-white",
                  "truncate",
                )}
              >
                {result.file_name}
              </h2>
              <div
                className={cn(
                  "flex",
                  "flex-wrap",
                  "items-center",
                  "gap-2",
                  "text-xs",
                  "font-semibold",
                  "text-gray-600",
                  "dark:text-gray-300",
                )}
              >
                <span
                  className={cn(
                    "rounded-md",
                    "bg-blue-100",
                    "dark:bg-blue-950/60",
                    "text-blue-700",
                    "dark:text-blue-300",
                    "px-2",
                    "py-0.5",
                    "font-bold",
                  )}
                >
                  {result.total_pages}{" "}
                  {result.total_pages > 1 ? "pages" : "page"}
                </span>
                <span>•</span>
                <span>{result.word_count.toLocaleString()} words</span>
                <span>•</span>
                <span>{(result.file_size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-black",
                    result.engine === "pdf.co"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
                  )}
                ></span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className={cn("flex", "items-center", "gap-2", "shrink-0")}>
            <button
              type="button"
              onClick={handleCopyText}
              className={cn(
                "inline-flex",
                "items-center",
                "gap-1.5",
                "h-9",
                "px-3",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-white",
                "dark:bg-[#1a1c24]",
                "text-xs",
                "font-bold",
                "text-gray-900",
                "dark:text-white",
                "shadow-[2px_2px_0_0_#111827]",
                "dark:shadow-[2px_2px_0_0_#000]",
                "hover:bg-gray-100",
                "dark:hover:bg-gray-800",
                "transition-all",
                "cursor-pointer",
              )}
              title="Copy Text to Clipboard"
            >
              {copied ? (
                <Check className={cn("h-4", "w-4", "text-emerald-500")} />
              ) : (
                <Copy className={cn("h-4", "w-4")} />
              )}
              <span className="hidden sm:inline">
                {copied ? "Copied!" : "Copy Text"}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex",
                "h-9",
                "w-9",
                "items-center",
                "justify-center",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-rose-100",
                "dark:bg-rose-950/60",
                "text-rose-700",
                "dark:text-rose-300",
                "shadow-[2px_2px_0_0_#111827]",
                "dark:shadow-[2px_2px_0_0_#000]",
                "hover:bg-rose-200",
                "transition-all",
                "cursor-pointer",
              )}
              title="Close Preview (Esc)"
            >
              <X className={cn("h-5", "w-5")} />
            </button>
          </div>
        </div>

        {/* Toolbar: Page navigation & Search */}
        <div
          className={cn(
            "flex",
            "flex-col",
            "sm:flex-row",
            "sm:items-center",
            "justify-between",
            "gap-3",
            "px-5",
            "py-3",
            "border-b-2",
            "border-gray-900/10",
            "dark:border-gray-700/60",
            "bg-gray-100/70",
            "dark:bg-[#171922]",
          )}
        >
          <div
            className={cn(
              "flex",
              "items-center",
              "gap-1.5",
              "overflow-x-auto",
              "pb-1",
              "sm:pb-0",
              "scrollbar-none",
            )}
          >
            <button
              type="button"
              onClick={() => setSelectedPage("all")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-black transition-all shrink-0 cursor-pointer",
                selectedPage === "all"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-[2px_2px_0_0_#000]"
                  : "bg-white dark:bg-[#20232c] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700",
              )}
            >
              All Pages ({result.total_pages})
            </button>
            {pages.map((pNum) => (
              <button
                key={pNum}
                type="button"
                onClick={() => setSelectedPage(pNum)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-black transition-all shrink-0 cursor-pointer",
                  selectedPage === pNum
                    ? "bg-blue-400 text-gray-900 border border-gray-900 shadow-[2px_2px_0_0_#111827]"
                    : "bg-white dark:bg-[#20232c] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700",
                )}
              >
                Page {pNum}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className={cn("relative", "w-full", "sm:w-64", "shrink-0")}>
            <Search
              className={cn(
                "absolute",
                "left-3",
                "top-1/2",
                "-translate-y-1/2",
                "h-3.5",
                "w-3.5",
                "text-gray-400",
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search document text..."
              className={cn(
                "w-full",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-white",
                "dark:bg-[#1a1c24]",
                "pl-8",
                "pr-8",
                "py-1.5",
                "text-xs",
                "font-bold",
                "text-gray-900",
                "dark:text-white",
                "placeholder:text-gray-400",
                "focus:outline-none",
                "focus:ring-2",
                "focus:ring-blue-400",
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={cn(
                  "absolute",
                  "right-2.5",
                  "top-1/2",
                  "-translate-y-1/2",
                  "text-gray-400",
                  "hover:text-gray-600",
                )}
              >
                <X className={cn("h-3.5", "w-3.5")} />
              </button>
            )}
          </div>
        </div>

        {/* Document Content Canvas */}
        <div
          className={cn(
            "flex-1",
            "overflow-y-auto",
            "p-4",
            "sm:p-8",
            "bg-gray-100",
            "dark:bg-[#0e1015]",
          )}
        >
          <div
            className={cn(
              "mx-auto",
              "max-w-3xl",
              "space-y-6",
              "rounded-2xl",
              "border-2",
              "border-gray-900",
              "dark:border-gray-700",
              "bg-white",
              "dark:bg-[#171922]",
              "p-6",
              "sm:p-10",
              "shadow-[4px_4px_0_0_#111827]",
              "dark:shadow-[4px_4px_0_0_#000]",
            )}
          >
            {filteredPreviews.length === 0 ? (
              <div
                className={cn(
                  "flex",
                  "flex-col",
                  "items-center",
                  "justify-center",
                  "py-16",
                  "text-center",
                )}
              >
                <FileText
                  className={cn(
                    "h-12",
                    "w-12",
                    "text-gray-300",
                    "dark:text-gray-600",
                    "mb-3",
                  )}
                />
                <p
                  className={cn(
                    "text-sm",
                    "font-bold",
                    "text-gray-700",
                    "dark:text-gray-300",
                  )}
                >
                  {searchQuery
                    ? `No text matching "${searchQuery}"`
                    : "No text content extracted"}
                </p>
                <p className={cn("text-xs", "text-gray-500", "mt-1")}>
                  The document has been converted and is ready for download.
                </p>
              </div>
            ) : (
              filteredPreviews.map((item, idx) => {
                if (item.type === "heading") {
                  return (
                    <div key={idx} className={cn("group", "relative")}>
                      <span
                        className={cn(
                          "absolute",
                          "-left-7",
                          "top-1",
                          "text-[10px]",
                          "font-black",
                          "text-gray-400",
                          "opacity-0",
                          "group-hover:opacity-100",
                          "transition-opacity",
                        )}
                      >
                        p.{item.page}
                      </span>
                      <h3
                        className={cn(
                          "text-lg",
                          "sm:text-xl",
                          "font-black",
                          "text-gray-900",
                          "dark:text-white",
                          "tracking-tight",
                          "pt-2",
                          "border-b",
                          "border-gray-200",
                          "dark:border-gray-800",
                          "pb-1",
                        )}
                      >
                        {highlightMatch(item.text, searchQuery)}
                      </h3>
                    </div>
                  );
                }

                if (
                  item.type === "table" &&
                  item.table_data &&
                  item.table_data.length > 0
                ) {
                  return (
                    <div
                      key={idx}
                      className={cn("group", "relative", "my-5", "space-y-2")}
                    >
                      <div
                        className={cn(
                          "flex",
                          "items-center",
                          "justify-between",
                          "text-xs",
                          "font-bold",
                          "text-gray-500",
                          "dark:text-gray-400",
                          "px-1",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex",
                            "items-center",
                            "gap-1.5",
                            "text-blue-600",
                            "dark:text-blue-400",
                            "font-black",
                          )}
                        >
                          <TableIcon className={cn("h-3.5", "w-3.5")} />
                          {item.text}
                        </span>
                        <span
                          className={cn(
                            "rounded-md",
                            "border",
                            "border-gray-300/60",
                            "dark:border-gray-700/60",
                            "bg-transparent",
                            "px-2",
                            "py-0.5",
                            "text-[10px]",
                            "font-bold",
                            "text-gray-600",
                            "dark:text-gray-300",
                          )}
                        >
                          Transparent Table • Page {item.page}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "overflow-x-auto",
                          "rounded-2xl",
                          "border",
                          "border-dashed",
                          "border-gray-300/80",
                          "dark:border-gray-700/80",
                          "bg-transparent",
                          "p-1",
                        )}
                      >
                        <table
                          className={cn(
                            "w-full",
                            "text-left",
                            "text-xs",
                            "bg-transparent",
                            "border-collapse",
                          )}
                        >
                          <tbody>
                            {item.table_data.map((row, rIdx) => (
                              <tr
                                key={rIdx}
                                className={cn(
                                  rIdx === 0
                                    ? "bg-transparent font-black text-gray-900 dark:text-white border-b-2 border-gray-300 dark:border-gray-700"
                                    : "bg-transparent border-b border-gray-200/40 dark:border-gray-800/40 last:border-b-0 text-gray-700 dark:text-gray-300 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-colors",
                                )}
                              >
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={cn(
                                      "py-2.5",
                                      "px-3",
                                      "bg-transparent",
                                      "font-medium",
                                      "border-none",
                                    )}
                                  >
                                    {highlightMatch(cell, searchQuery)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={idx} className={cn("group", "relative")}>
                    <span
                      className={cn(
                        "absolute",
                        "-left-7",
                        "top-1",
                        "text-[10px]",
                        "font-black",
                        "text-gray-400",
                        "opacity-0",
                        "group-hover:opacity-100",
                        "transition-opacity",
                      )}
                    >
                      p.{item.page}
                    </span>
                    <p
                      className={cn(
                        "text-xs",
                        "sm:text-sm",
                        "font-medium",
                        "text-gray-800",
                        "dark:text-gray-200",
                        "leading-relaxed",
                      )}
                    >
                      {highlightMatch(item.text, searchQuery)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex",
            "flex-col",
            "sm:flex-row",
            "items-center",
            "justify-between",
            "gap-3",
            "px-6",
            "py-3.5",
            "border-t-2",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-gray-50",
            "dark:bg-[#1a1c24]",
          )}
        >
          <p
            className={cn(
              "text-xs",
              "font-bold",
              "text-gray-500",
              "dark:text-gray-400",
            )}
          >
            📄 Formatted Word document (.docx) • Full compatibility with
            Microsoft Word & Google Docs
          </p>
          <div className={cn("flex", "items-center", "gap-3")}>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-white",
                "dark:bg-[#20232c]",
                "px-4",
                "py-1.5",
                "text-xs",
                "font-black",
                "text-gray-900",
                "dark:text-white",
                "shadow-[2px_2px_0_0_#111827]",
                "dark:shadow-[2px_2px_0_0_#000]",
                "hover:bg-gray-100",
                "dark:hover:bg-gray-800",
                "cursor-pointer",
              )}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => downloadWordFile(result)}
              className={cn(
                "inline-flex",
                "items-center",
                "gap-1.5",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-blue-400",
                "hover:bg-blue-500",
                "px-4",
                "py-1.5",
                "text-xs",
                "font-black",
                "text-gray-900",
                "shadow-[2px_2px_0_0_#111827]",
                "dark:shadow-[2px_2px_0_0_#000]",
                "cursor-pointer",
              )}
            >
              <Download className={cn("h-4", "w-4")} />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
