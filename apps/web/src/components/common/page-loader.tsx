export default function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-surface-200 dark:border-surface-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary-500" />
        </div>
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Loading...</p>
      </div>
    </div>
  );
}
