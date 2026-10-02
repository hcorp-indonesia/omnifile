import { useThemeStore } from "@/store/theme-store";
import { cn } from "@/lib/utils";

export default function PageLoader() {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "flex",
        "min-h-screen",
        "w-full",
        "items-center",
        "justify-center",
        "transition-colors",
        "duration-300",
        isDark ? "bg-[#0e1015]" : "bg-[#fdfbf7]",
      )}
    >
      <div className={cn("flex", "flex-col", "items-center")}>
        {/* Logo: Preserves yellow brand quadrant in both light and dark mode */}
        <div className={cn("relative", "flex", "items-center", "justify-center")}>
          <img
            src={isDark ? "/logo-dark.png" : "/logo-trimmed.png"}
            alt="OmniFile Loading"
            loading="lazy"
            decoding="async"
            className={cn(
              "h-12",
              "sm:h-14",
              "w-auto",
              "object-contain",
              "transition-all",
              "duration-300",
            )}
          />
        </div>

        {/* Sleek Horizontal Loader Bar Track */}
        <div
          className={cn(
            "relative",
            "mt-5",
            "h-1.5",
            "w-48",
            "sm:w-56",
            "overflow-hidden",
            "rounded-full",
            "transition-colors",
            "duration-300",
            isDark ? "bg-white/10" : "bg-surface-200",
          )}
        >
          {/* Animated Yellow Bar Segment (Matched to Logo Yellow #ffcf5b) */}
          <div
            className={cn(
              "absolute",
              "top-0",
              "bottom-0",
              "w-[35%]",
              "rounded-full",
              "bg-[#ffcf5b]",
              "shadow-[0_0_10px_2px_rgba(255,207,91,0.7)]",
              "animate-loader-bar",
            )}
          />
        </div>
      </div>
    </div>
  );
}




