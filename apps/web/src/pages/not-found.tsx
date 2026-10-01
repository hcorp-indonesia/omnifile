import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-50 px-4 dark:bg-surface-950">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-2xl shadow-primary-500/30">
          <Sparkles className="h-10 w-10 text-white" />
        </div>

        <h1 className="text-8xl font-extrabold bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="mt-4 text-xl font-semibold text-surface-900 dark:text-surface-100">
          Page not found
        </h2>
        <p className="mt-2 max-w-md text-sm text-surface-500 dark:text-surface-400">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <button
          id="go-back-btn"
          onClick={() => navigate('/dashboard')}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
