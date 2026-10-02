import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={cn("flex", "min-h-screen", "flex-col", "items-center", "justify-center", "bg-[#fdfbf7]", "dark:bg-[#0e1015]", "px-4")}>
      <div className={cn("text-center")}>
        

        <h1 className={cn("text-8xl", "font-black", "text-gray-900", "dark:text-white", "tracking-tight")}>
          404
        </h1>
        <h2 className={cn("mt-4", "text-2xl", "font-bold", "text-gray-900", "dark:text-white")}>
          Page not found
        </h2>
        <p className={cn("mt-2", "max-w-md", "text-base", "font-semibold", "text-gray-600", "dark:text-gray-400")}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <button
          id="go-back-btn"
          onClick={() => navigate('/dashboard')}
          className={cn(
            "mt-8",
            "inline-flex",
            "items-center",
            "gap-2",
            "rounded-xl",
            "bg-purple-400",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "px-6",
            "py-3.5",
            "text-base",
            "font-bold",
            "text-gray-900",
            "shadow-[4px_4px_0_0_#111827]",
            "dark:shadow-[4px_4px_0_0_#000]",
            "transition-all",
            "hover:bg-purple-500",
            "hover:-translate-y-1",
            "cursor-pointer",
          )}
        >
          <ArrowLeft className={cn("h-5", "w-5")} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
