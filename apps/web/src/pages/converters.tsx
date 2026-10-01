import { useState } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useConverterList } from '@/hooks/use-converters';
import ConverterTable from '@/components/converter/converter-table';

export default function ConvertersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 10;

  const { data, isLoading } = useConverterList(page, perPage);

  const converters = data?.data ?? [];
  const metadata = data?.metadata;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Converters</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Manage your unit conversion rules
          </p>
        </div>

        <button
          id="create-converter-btn"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          New Converter
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          id="search-converters"
          type="text"
          placeholder="Search converters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-surface-200 bg-white py-2.5 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500 dark:focus:border-primary-400"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <ConverterTable
          converters={converters}
          metadata={metadata}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
