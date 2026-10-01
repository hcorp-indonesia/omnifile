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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-300 bg-white py-16 dark:border-surface-700 dark:bg-surface-900">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
          No converters found
        </p>
        <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
          Create your first converter to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-800/50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Name
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                From → To
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Category
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Status
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
            {converters.map((converter) => (
              <tr
                key={converter.id}
                className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
              >
                <td className="px-5 py-4 font-medium text-surface-900 dark:text-surface-100">
                  {converter.name}
                </td>
                <td className="px-5 py-4 text-surface-600 dark:text-surface-300">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                      {converter.from_unit}
                    </span>
                    <span className="text-surface-400">→</span>
                    <span className="rounded-md bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">
                      {converter.to_unit}
                    </span>
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium capitalize text-surface-700 dark:bg-surface-800 dark:text-surface-300">
                    {converter.category}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      converter.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        converter.is_active ? 'bg-emerald-500' : 'bg-red-500'
                      )}
                    />
                    {converter.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
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
        <div className="flex items-center justify-between border-t border-surface-200 px-5 py-3.5 dark:border-surface-800">
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Page {metadata.current_page} of {metadata.total_page} · {metadata.total_row} total
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 text-surface-600 transition-colors hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= metadata.total_page}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 text-surface-600 transition-colors hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
