import { cn } from "@/lib/utils";
import { ArrowRight, FileText, Image, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    title: "PDF",
    description:
      "Convert PDF documents to Word, Excel, JPG, or merge and compress PDF files with ease.",
    icon: FileText,
    bg: "bg-red-400",
    path: "/pdf",
  },
  {
    title: "Image",
    description:
      "Automatically remove photo backgrounds with AI, upscale resolution to HD.",
    icon: Image,
    bg: "bg-purple-400",
    path: "/media-tools",
  },
  {
    title: "Convert",
    description:
      "Transform media file formats (images, audio, documents) and convert unit values instantly.",
    icon: RefreshCw,
    bg: "bg-yellow-400",
    path: "/media-tools",
  },
];

export default function DashboardPage() {
  return (
    <div className={cn("relative", "space-y-12", "pb-12", "pt-4")}>
      <div
        aria-hidden="true"
        className={cn(
          "absolute",
          "-top-6",
          "left-1/2",
          "-translate-x-1/2",
          "w-screen",
          "h-120",
          "pointer-events-none",
          "select-none",
          "z-0",
          "overflow-hidden",
        )}
      >
        <div
          className={cn(
            "hidden",
            "md:flex",
            "items-center",
            "justify-center",
            "absolute",
            "top-14",
            "-left-16",
            "xl:-left-22",
            "rotate-[22deg]",
            "animate-watermark-left",
          )}
        >
          <div
            className={cn(
              "absolute",
              "w-80",
              "h-80",
              "rounded-full",
              "bg-rose-500/8",
              "dark:bg-rose-500/12",
              "blur-3xl",
            )}
          />
          <FileText
            className={cn(
              "w-80",
              "h-80",
              "text-rose-500/[0.14]",
              "dark:text-rose-400/16",
              "stroke-[1.2]",
            )}
          />
        </div>

        <div
          className={cn(
            "hidden",
            "md:flex",
            "items-center",
            "justify-center",
            "absolute",
            "top-14",
            "-right-20",
            "xl:-right-28",
            "rotate-[-18deg]",
            "animate-watermark-right",
          )}
        >
          <div
            className={cn(
              "absolute",
              "w-80",
              "h-80",
              "rounded-full",
              "bg-purple-500/8",
              "dark:bg-purple-500/12",
              "blur-3xl",
            )}
          />
          <Image
            className={cn(
              "w-80",
              "h-80",
              "text-purple-500/[0.14]",
              "dark:text-purple-400/[0.16]",
              "stroke-[1.2]",
            )}
          />
        </div>
      </div>

      {/* Main Content Container */}
      <div
        className={cn("max-w-6xl", "mx-auto", "relative", "z-10", "space-y-12")}
      >
        {/* Hero Section */}
        <div className={cn("text-center", "space-y-6", "py-4", "md:py-8")}>
          <h1
            className={cn(
              "text-5xl",
              "md:text-6xl",
              "font-bold",
              "text-gray-900",
              "dark:text-white",
              "tracking-tight",
              "leading-tight",
            )}
          >
            Instant file power
            <br />
            <span
              className={cn(
                "text-transparent",
                "bg-clip-text",
                "bg-linear-to-r",
                "from-purple-600",
                "to-emerald-500",
                "selection:text-gray-900",
                "selection:bg-yellow-200",
                "dark:selection:text-gray-900",
              )}
            >
              Seamless smart tools
            </span>
          </h1>
          <p
            className={cn(
              "text-xl",
              "font-bold",
              "text-gray-600",
              "dark:text-gray-400",
              "max-w-2xl",
              "mx-auto",
            )}
          >
            Convert formats, remove backgrounds, and upscale images for free,
            fast, and secure.
          </p>
        </div>

        {/* Feature Cards Grid (PDF, Image, Convert) */}
        <div className={cn("grid", "gap-8", "md:grid-cols-3", "pt-8")}>
          {features.map((feature) => (
            <Link
              key={feature.title}
              to={feature.path}
              className={cn(
                "group",
                "block",
                "rounded-3xl",
                "border-3",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-white",
                "dark:bg-[#16181d]",
                "p-8",
                "transition-all",
                "duration-200",
                "hover:-translate-y-2",
                "hover:shadow-[8px_8px_0_0_#111827]",
                "dark:hover:shadow-[8px_8px_0_0_#000]",
              )}
            >
              <div
                className={cn(
                  "flex",
                  "h-16",
                  "w-16",
                  "items-center",
                  "justify-center",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "shadow-[4px_4px_0_0_#111827]",
                  "dark:shadow-[4px_4px_0_0_#000]",
                  feature.bg,
                  "mb-8",
                  "group-hover:scale-110",
                  "transition-transform",
                )}
              >
                <feature.icon className={cn("h-8", "w-8", "text-gray-900")} />
              </div>
              <h3
                className={cn(
                  "text-2xl",
                  "font-bold",
                  "text-gray-900",
                  "dark:text-white",
                  "mb-3",
                )}
              >
                {feature.title}
              </h3>
              <p
                className={cn(
                  "text-gray-600",
                  "dark:text-gray-400",
                  "font-bold",
                  "mb-8",
                  "h-12",
                )}
              >
                {feature.description}
              </p>

              <div
                className={cn(
                  "flex",
                  "items-center",
                  "text-gray-900",
                  "dark:text-white",
                  "font-bold",
                  "gap-2",
                  "group-hover:gap-4",
                  "transition-all",
                )}
              >
                Coba Sekarang <ArrowRight className={cn("w-5", "h-5")} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
