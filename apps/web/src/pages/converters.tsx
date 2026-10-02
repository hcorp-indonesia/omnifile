import { useState } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useConverterList } from '@/hooks/use-converters';
import ConverterTable from '@/components/converter/converter-table';
import { cn } from '@/lib/utils';

export default function ConvertersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 10;

  const { data, isLoading } = useConverterList(page, perPage);

  const converters = data?.data ?? [];
  const metadata = data?.metadata;

  return (
    <div className={cn("space-y-6", "max-w-6xl", "mx-auto")}>
      {/* Page Header */}
      <div className={cn("flex", "flex-col", "gap-4", "sm:flex-row", "sm:items-center", "sm:justify-between")}>
        <div>
          <h1 className={cn("text-3xl", "font-bold", "text-gray-900", "dark:text-white", "tracking-tight")}>
            Converters
          </h1>
          <p className={cn("mt-1", "text-sm", "font-bold", "text-gray-600", "dark:text-gray-400")}>
            Manage your unit conversion rules
          </p>
        </div>

        <button
          id="create-converter-btn"
          className={cn(
            "inline-flex",
            "items-center",
            "gap-2",
            "rounded-xl",
            "bg-yellow-400",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "px-6",
            "py-3",
            "font-bold",
            "text-gray-900",
            "shadow-[4px_4px_0_0_#111827]",
            "dark:shadow-[4px_4px_0_0_#000]",
            "transition-all",
            "hover:bg-yellow-500",
            "hover:-translate-y-1"
          )}
        >
          <Plus className={cn("h-5", "w-5")} />
          New Converter
        </button>
      </div>

      {/* Search */}
      <div className={cn("relative", "max-w-sm")}>
        <Search className={cn("absolute", "left-4", "top-1/2", "h-5", "w-5", "-translate-y-1/2", "text-gray-500", "dark:text-gray-400")} />
        <input
          id="search-converters"
          type="text"
          placeholder="Search converters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "w-full",
            "rounded-xl",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "bg-white",
            "dark:bg-[#1a1c22]",
            "py-3",
            "pl-12",
            "pr-4",
            "text-sm",
            "font-bold",
            "text-gray-900",
            "dark:text-white",
            "placeholder:text-gray-500",
            "dark:placeholder:text-gray-400",
            "transition-colors",
            "focus:outline-none",
            "focus:ring-0",
            "focus:border-purple-500",
            "shadow-[4px_4px_0_0_#111827]",
            "dark:shadow-[4px_4px_0_0_#000]"
          )}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className={cn("flex", "items-center", "justify-center", "py-20")}>
          <Loader2 className={cn("h-8", "w-8", "animate-spin", "text-yellow-500")} />
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
