import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConverterListItem, Metadata } from '@/types';

interface ConverterTableProps {
  converters: ConverterListItem[];
  metadata?: Metadata;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function ConverterTable({
  converters,
  metadata,
  currentPage,
  onPageChange,
}: ConverterTableProps) {
  if (converters.length === 0) {
    return (
      <div className={cn("flex", "flex-col", "items-center", "justify-center", "rounded-2xl", "border-3", "border-dashed", "border-gray-300", "dark:border-gray-700", "bg-white", "dark:bg-[#16181d]", "py-16")}>
        <p className={cn("text-base", "font-bold", "text-gray-900", "dark:text-white")}>
          No converters found
        </p>
        <p className={cn("mt-1", "text-xs", "font-semibold", "text-gray-500", "dark:text-gray-400")}>
          Create your first converter to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden", "rounded-2xl", "border-3", "border-gray-900", "dark:border-gray-700", "bg-white", "dark:bg-[#16181d]", "shadow-[4px_4px_0_0_#111827]", "dark:shadow-[4px_4px_0_0_#000]")}>
      <div className={cn("overflow-x-auto")}>
        <table className={cn("w-full", "text-sm")}>
          <thead>
            <tr className={cn("border-b-3", "border-gray-900", "dark:border-gray-700", "bg-gray-50", "dark:bg-[#1e222a]")}>
              <th className={cn("px-5", "py-4", "text-left", "text-xs", "font-bold", "uppercase", "tracking-wider", "text-gray-900", "dark:text-white")}>
                Name
              </th>
              <th className={cn("px-5", "py-4", "text-left", "text-xs", "font-bold", "uppercase", "tracking-wider", "text-gray-900", "dark:text-white")}>
                From → To
              </th>
              <th className={cn("px-5", "py-4", "text-left", "text-xs", "font-bold", "uppercase", "tracking-wider", "text-gray-900", "dark:text-white")}>
                Category
              </th>
              <th className={cn("px-5", "py-4", "text-left", "text-xs", "font-bold", "uppercase", "tracking-wider", "text-gray-900", "dark:text-white")}>
                Status
              </th>
              <th className={cn("px-5", "py-4", "text-right", "text-xs", "font-bold", "uppercase", "tracking-wider", "text-gray-900", "dark:text-white")}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={cn("divide-y-2", "divide-gray-200", "dark:divide-gray-800")}>
            {converters.map((converter) => (
              <tr
                key={converter.id}
                className={cn("transition-colors", "hover:bg-yellow-50", "dark:hover:bg-[#252932]")}
              >
                <td className={cn("px-5", "py-4", "font-bold", "text-gray-900", "dark:text-white")}>
                  {converter.name}
                </td>
                <td className={cn("px-5", "py-4", "text-gray-600", "dark:text-gray-300")}>
                  <span className={cn("inline-flex", "items-center", "gap-1.5")}>
                    <span className={cn("rounded-lg", "border-2", "border-gray-900", "dark:border-gray-700", "bg-blue-100", "dark:bg-blue-900/40", "px-2.5", "py-1", "text-xs", "font-bold", "text-blue-900", "dark:text-blue-200")}>
                      {converter.from_unit}
                    </span>
                    <span className={cn("text-gray-400", "font-bold")}>→</span>
                    <span className={cn("rounded-lg", "border-2", "border-gray-900", "dark:border-gray-700", "bg-purple-100", "dark:bg-purple-900/40", "px-2.5", "py-1", "text-xs", "font-bold", "text-purple-900", "dark:text-purple-200")}>
                      {converter.to_unit}
                    </span>
                  </span>
                </td>
                <td className={cn("px-5", "py-4")}>
                  <span className={cn("inline-flex", "rounded-lg", "border-2", "border-gray-900", "dark:border-gray-700", "bg-gray-100", "dark:bg-gray-800", "px-2.5", "py-1", "text-xs", "font-bold", "capitalize", "text-gray-800", "dark:text-gray-200")}>
                    {converter.category}
                  </span>
                </td>
                <td className={cn("px-5", "py-4")}>
                  <span
                    className={cn(
                      "inline-flex",
                      "items-center",
                      "gap-1.5",
                      "rounded-lg",
                      "border-2",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "px-2.5",
                      "py-1",
                      "text-xs",
                      "font-bold",
                      converter.is_active
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2",
                        "w-2",
                        "rounded-full",
                        converter.is_active ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                    {converter.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className={cn("px-5", "py-4", "text-right")}>
                  <button className={cn("text-xs", "font-bold", "text-purple-600", "hover:text-purple-700", "dark:text-purple-400", "dark:hover:text-purple-300", "hover:underline")}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {metadata && metadata.total_page > 1 && (
        <div className={cn("flex", "items-center", "justify-between", "border-t-3", "border-gray-900", "dark:border-gray-700", "bg-gray-50", "dark:bg-[#1e222a]", "px-5", "py-3.5")}>
          <p className={cn("text-xs", "font-bold", "text-gray-600", "dark:text-gray-400")}>
            Page {metadata.current_page} of {metadata.total_page} · {metadata.total_row} total
          </p>
          <div className={cn("flex", "gap-1")}>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className={cn("flex", "h-8", "w-8", "items-center", "justify-center", "rounded-lg", "border-2", "border-gray-900", "dark:border-gray-700", "bg-white", "dark:bg-[#1a1c22]", "text-gray-900", "dark:text-white", "transition-colors", "hover:bg-yellow-400", "disabled:opacity-40", "disabled:cursor-not-allowed")}
            >
              <ChevronLeft className={cn("h-4", "w-4")} />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= metadata.total_page}
              className={cn("flex", "h-8", "w-8", "items-center", "justify-center", "rounded-lg", "border-2", "border-gray-900", "dark:border-gray-700", "bg-white", "dark:bg-[#1a1c22]", "text-gray-900", "dark:text-white", "transition-colors", "hover:bg-yellow-400", "disabled:opacity-40", "disabled:cursor-not-allowed")}
            >
              <ChevronRight className={cn("h-4", "w-4")} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
