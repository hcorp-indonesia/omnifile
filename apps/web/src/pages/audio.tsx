import { Clock3, Headphones, Music2 } from "lucide-react";

import { cn } from "@/lib/utils";

export default function AudioPage() {
  return (
    <div className={cn("mx-auto", "flex", "min-h-[calc(100vh-180px)]", "max-w-5xl", "items-center", "justify-center", "pb-16", "pt-6")}>
      <section className={cn("relative", "w-full", "max-w-3xl", "overflow-hidden", "rounded-3xl", "border-3", "border-gray-900", "bg-white", "p-8", "text-center", "shadow-[8px_8px_0_0_#111827]", "dark:border-gray-700", "dark:bg-[#16181d]", "dark:shadow-[8px_8px_0_0_#000]", "sm:p-14")}>
        <div className={cn("pointer-events-none", "absolute", "-right-16", "-top-16", "h-48", "w-48", "rounded-full", "bg-emerald-300/40", "blur-3xl")} />
        <div className={cn("pointer-events-none", "absolute", "-bottom-20", "-left-16", "h-48", "w-48", "rounded-full", "bg-blue-300/30", "blur-3xl")} />

        <div className={cn("relative", "mx-auto", "mb-7", "flex", "h-20", "w-20", "items-center", "justify-center", "rounded-3xl", "border-3", "border-gray-900", "bg-emerald-300", "text-gray-900", "shadow-[4px_4px_0_0_#111827]", "dark:border-gray-700", "dark:shadow-[4px_4px_0_0_#000]")}>
          <Headphones className={cn("h-10", "w-10")} />
          <span className={cn("absolute", "-right-3", "-top-3", "flex", "h-9", "w-9", "items-center", "justify-center", "rounded-full", "border-2", "border-gray-900", "bg-yellow-400", "dark:border-gray-700")}>
            <Clock3 className={cn("h-4", "w-4")} />
          </span>
        </div>

        <span className={cn("relative", "inline-flex", "rounded-full", "border-2", "border-gray-900", "bg-yellow-400", "px-4", "py-2", "text-xs", "font-extrabold", "uppercase", "tracking-wider", "text-gray-900", "shadow-[2px_2px_0_0_#111827]")}>
          Coming Soon
        </span>
        <h1 className={cn("relative", "mt-5", "text-4xl", "font-bold", "tracking-tight", "text-gray-900", "dark:text-white", "sm:text-5xl")}>
          Audio Tools
        </h1>
        <p className={cn("relative", "mx-auto", "mt-4", "max-w-xl", "text-base", "font-semibold", "leading-relaxed", "text-gray-600", "dark:text-gray-400", "sm:text-lg")}>
          Audio conversion and optimization tools are being prepared. Soon you can convert, compress, and transform your audio files in one place.
        </p>
        <div className={cn("relative", "mt-8", "flex", "items-center", "justify-center", "gap-3", "text-sm", "font-bold", "text-gray-700", "dark:text-gray-300")}>
          <Music2 className={cn("h-5", "w-5", "text-emerald-600", "dark:text-emerald-400")} />
          More audio magic is on the way
        </div>
      </section>
    </div>
  );
}
