import { Loader2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ImageProcessingStatus = "pending" | "processing" | "done" | "error";

interface ImageProcessingCardProps {
  thumbnailUrl?: string;
  fileName: string;
  metadata: string;
  index?: number;
  status?: ImageProcessingStatus;
  progress?: number;
  processingLabel?: string;
  progressLabel?: string;
  errorMessage?: string;
  actions?: ReactNode;
  detail?: ReactNode;
  onRemove?: () => void;
  removeDisabled?: boolean;
  className?: string;
}

export function ImageProcessingCard({
  thumbnailUrl,
  fileName,
  metadata,
  index,
  status = "pending",
  progress = 0,
  processingLabel = "Processing...",
  progressLabel = "Processing image",
  errorMessage,
  actions,
  detail,
  onRemove,
  removeDisabled = false,
  className,
}: ImageProcessingCardProps) {
  const normalizedProgress = Math.min(Math.max(Math.round(progress), 0), 100);

  return (
    <article
      className={cn(
        "overflow-hidden",
        "rounded-2xl",
        "border-3",
        "border-gray-900",
        "bg-white",
        "shadow-[4px_4px_0_0_#111827]",
        "transition-all",
        "dark:border-gray-700",
        "dark:bg-[#16181d]",
        "dark:shadow-[4px_4px_0_0_#000]",
        className,
      )}
    >
      <div
        className={cn(
          "flex",
          "items-center",
          "justify-between",
          "gap-4",
          "p-4",
        )}
      >
        <div className={cn("flex", "min-w-0", "items-center", "gap-3.5")}>
          <div
            className={cn(
              "relative",
              "flex",
              "h-12",
              "w-12",
              "shrink-0",
              "items-center",
              "justify-center",
              "overflow-hidden",
              "rounded-xl",
              "border-2",
              "border-gray-900",
              "bg-gray-100",
              "dark:border-gray-700",
              "dark:bg-gray-800",
            )}
          >
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={fileName}
                className={cn("h-full", "w-full", "object-contain")}
              />
            )}
            {index !== undefined && (
              <span
                className={cn(
                  "absolute",
                  "right-0",
                  "bottom-0",
                  "rounded-tl-md",
                  "bg-gray-900",
                  "px-1",
                  "py-0.5",
                  "text-[8px]",
                  "font-black",
                  "text-white",
                )}
              >
                #{index + 1}
              </span>
            )}
          </div>

          <div className={cn("min-w-0")}>
            <p
              title={fileName}
              className={cn(
                "truncate",
                "text-sm",
                "font-bold",
                "text-gray-900",
                "dark:text-white",
              )}
            >
              {fileName}
            </p>
            <div
              className={cn(
                "mt-0.5",
                "flex",
                "flex-wrap",
                "items-center",
                "gap-2",
                "text-xs",
                "font-semibold",
                "text-gray-500",
                "dark:text-gray-400",
              )}
            >
              <span>{metadata}</span>
              {status === "processing" && (
                <span
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-1",
                    "font-bold",
                    "text-amber-500",
                  )}
                >
                  <Loader2 className={cn("h-3.5", "w-3.5", "animate-spin")} />
                  {processingLabel}
                </span>
              )}
              {status === "pending" && (
                <span className={cn("text-gray-400")}>Ready</span>
              )}
              {status === "error" && (
                <span className={cn("font-bold", "text-red-500")}>
                  {errorMessage || "Error"}
                </span>
              )}
              {detail}
            </div>
          </div>
        </div>

        <div className={cn("flex", "shrink-0", "items-center", "gap-2")}>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={removeDisabled}
              className={cn(
                "inline-flex",
                "h-8",
                "w-8",
                "cursor-pointer",
                "items-center",
                "justify-center",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "bg-white",
                "text-rose-600",
                "shadow-[2px_2px_0_0_#111827]",
                "transition-all",
                "hover:-translate-y-0.5",
                "hover:bg-rose-50",
                "disabled:cursor-not-allowed",
                "disabled:opacity-50",
                "dark:border-gray-700",
                "dark:bg-[#1a1c22]",
                "dark:text-rose-400",
                "dark:shadow-[2px_2px_0_0_#000]",
                "dark:hover:bg-rose-950/40",
              )}
              aria-label={`Remove ${fileName}`}
            >
              <Trash2 className={cn("h-4", "w-4")} />
            </button>
          )}
          {actions}
          {status === "processing" && !actions && (
            <span
              className={cn(
                "flex",
                "items-center",
                "gap-1.5",
                "px-3",
                "py-2",
                "text-xs",
                "font-bold",
                "text-gray-500",
              )}
            >
              <Loader2 className={cn("h-3.5", "w-3.5", "animate-spin")} />
              Processing
            </span>
          )}
        </div>
      </div>

      {status === "processing" && (
        <div
          className={cn(
            "space-y-1.5",
            "border-t-2",
            "border-gray-100",
            "bg-gray-50/60",
            "px-4",
            "pt-3",
            "pb-4",
            "dark:border-gray-800",
            "dark:bg-[#121316]",
          )}
        >
          <div
            className={cn(
              "flex",
              "items-center",
              "justify-between",
              "text-xs",
              "font-bold",
            )}
          >
            <span className={cn("text-gray-600", "dark:text-gray-300")}>
              {progressLabel}
            </span>
            <span className={cn("text-purple-600", "dark:text-purple-300")}>
              {normalizedProgress}%
            </span>
          </div>
          <div
            className={cn(
              "h-2.5",
              "overflow-hidden",
              "rounded-full",
              "border-2",
              "border-gray-900",
              "bg-gray-200",
              "dark:border-gray-700",
              "dark:bg-gray-800",
            )}
          >
            <div
              className={cn(
                "h-full",
                "bg-purple-400",
                "transition-all",
                "duration-300",
              )}
              style={{ width: `${Math.max(normalizedProgress, 5)}%` }}
            />
          </div>
        </div>
      )}
    </article>
  );
}
