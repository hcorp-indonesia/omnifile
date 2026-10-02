import { useThemeStore } from "@/store/theme-store";
import {
  Bot,
  Calculator,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Moon,
  Music,
  ScanText,
  Scissors,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

const pdfConvertTools = [
  {
    title: "PDF to Word",
    desc: "Ubah PDF ke DOCX",
    icon: FileText,
    bg: "bg-blue-300",
  },
  {
    title: "PDF to Excel",
    desc: "Ekstrak tabel ke XLS",
    icon: FileSpreadsheet,
    bg: "bg-emerald-300",
  },
  {
    title: "PDF to JPG",
    desc: "Simpan halaman jadi JPG",
    icon: ImageIcon,
    bg: "bg-amber-300",
  },
];

const pdfEditTools = [
  {
    title: "Merge PDF",
    desc: "Gabung beberapa PDF",
    icon: Layers,
    bg: "bg-purple-300",
  },
  {
    title: "Split PDF",
    desc: "Pisah halaman dokumen",
    icon: Scissors,
    bg: "bg-pink-300",
  },
  {
    title: "Compress PDF",
    desc: "Kecilkan ukuran file",
    icon: FileArchive,
    bg: "bg-red-300",
  },
  {
    title: "OCR PDF",
    desc: "Ekstrak teks dari scan",
    icon: ScanText,
    bg: "bg-teal-300",
  },
];

const aiMediaTools = [
  {
    title: "Remove BG",
    desc: "Hapus background foto",
    icon: Scissors,
    bg: "bg-purple-300",
  },
  {
    title: "Upscale HD",
    desc: "Tingkatkan resolusi AI",
    icon: Sparkles,
    bg: "bg-amber-300",
  },
  {
    title: "AI Assistant",
    desc: "Chat & tanya dokumen",
    icon: Bot,
    bg: "bg-indigo-300",
  },
];

const generalTools = [
  {
    title: "Image Converter",
    desc: "Konversi PNG, WebP, dll",
    icon: ImageIcon,
    bg: "bg-emerald-300",
  },
  {
    title: "Audio Converter",
    desc: "Ubah format audio/musik",
    icon: Music,
    bg: "bg-blue-300",
  },
  {
    title: "Unit Converters",
    desc: "Konversi satuan hitung",
    icon: Calculator,
    bg: "bg-orange-300",
  },
];

export default function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolsRef.current &&
        !toolsRef.current.contains(event.target as Node)
      ) {
        setIsToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        "sticky",
        "top-0",
        "z-30",
        "w-full",
        "border-b-3",
        "border-gray-900",
        "dark:border-gray-800",
        "bg-white",
        "dark:bg-[#121316]",
        "transition-colors",
        "duration-200",
        "px-8",
        "lg:px-24",
      )}
    >
      <div
        className={cn(
          "flex",
          "h-20",
          "w-full",
          "items-center",
          "justify-between",
        )}
      >
        {/* 1. Left: Logo */}
        <div className={cn("flex", "items-center", "shrink-0")}>
          <Link
            to="/"
            className={cn("flex", "items-center", "gap-3", "group", "shrink-0")}
          >
            <img
              src={theme === "dark" ? "/logo-dark.png" : "/logo-trimmed.png"}
              alt="OmniFile Logo"
              loading="lazy"
              decoding="async"
              className={cn("h-9", "sm:h-10", "w-auto", "object-contain")}
            />
          </Link>
        </div>

        {/* 2. Center: Nav Links */}
        <nav
          className={cn(
            "hidden",
            "lg:flex",
            "flex-1",
            "items-center",
            "justify-center",
            "gap-1.5",
          )}
        >
          {/* Tools Mega Menu */}
          <div ref={toolsRef} className={cn("relative")}>
            <button
              onClick={() => setIsToolsOpen((prev) => !prev)}
              className={cn(
                "flex",
                "items-center",
                "gap-2",
                "font-bold",
                "text-sm",
                "cursor-pointer",
                "transition-all",
                "rounded-xl",
                "px-3",
                "py-2",
                "border-2",
                isToolsOpen
                  ? "bg-yellow-400 text-gray-900 border-gray-900 shadow-[2px_2px_0_0_#111827]"
                  : "border-transparent text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800",
              )}
            >
              <LayoutGrid className={cn("h-4", "w-4")} />
              <span>Tools</span>
            </button>

            {/* Mega Menu Dropdown (Kotak-Kotak Style) */}
            {isToolsOpen && (
              <div
                className={cn(
                  "absolute",
                  "top-full",
                  "left-1/2",
                  "-translate-x-1/2",
                  "pt-3",
                  "w-[980px]",
                  "z-50",
                )}
              >
                <div
                  className={cn(
                    "bg-white",
                    "dark:bg-[#16181d]",
                    "border-3",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "rounded-3xl",
                    "shadow-[8px_8px_0_0_#111827]",
                    "dark:shadow-[8px_8px_0_0_#000]",
                    "p-6",
                  )}
                >
                  <div
                    className={cn("grid", "grid-cols-4", "gap-5", "text-left")}
                  >
                    {/* Column 1: Convert PDF */}
                    <div className={cn("space-y-3")}>
                      <h4
                        className={cn(
                          "text-xs",
                          "font-bold",
                          "text-gray-400",
                          "dark:text-gray-500",
                          "uppercase",
                          "tracking-wider",
                          "px-1",
                        )}
                      >
                        Convert PDF
                      </h4>
                      <div className={cn("space-y-2.5")}>
                        {pdfConvertTools.map((tool) => (
                          <Link
                            key={tool.title}
                            to="/pdf"
                            onClick={() => setIsToolsOpen(false)}
                            className={cn(
                              "flex",
                              "items-center",
                              "gap-2.5",
                              "p-2.5",
                              "rounded-2xl",
                              "border-2",
                              "border-gray-900",
                              "dark:border-gray-700",
                              "bg-[#fdfbf7]",
                              "dark:bg-[#1a1c22]",
                              "hover:bg-yellow-100",
                              "dark:hover:bg-[#252932]",
                              "hover:-translate-y-0.5",
                              "hover:shadow-[2px_2px_0_0_#111827]",
                              "dark:hover:shadow-[2px_2px_0_0_#000]",
                              "transition-all",
                              "group",
                            )}
                          >
                            <div
                              className={cn(
                                "flex",
                                "h-9",
                                "w-9",
                                "shrink-0",
                                "items-center",
                                "justify-center",
                                "rounded-xl",
                                "border-2",
                                "border-gray-900",
                                "dark:border-gray-700",
                                "shadow-[1px_1px_0_0_#111827]",
                                "dark:shadow-[1px_1px_0_0_#000]",
                                tool.bg,
                                "group-hover:scale-105",
                                "transition-transform",
                              )}
                            >
                              <tool.icon
                                className={cn("h-4", "w-4", "text-gray-900")}
                              />
                            </div>
                            <div className={cn("min-w-0")}>
                              <div
                                className={cn(
                                  "text-xs",
                                  "font-bold",
                                  "text-gray-900",
                                  "dark:text-white",
                                  "truncate",
                                )}
                              >
                                {tool.title}
                              </div>
                              <div
                                className={cn(
                                  "text-[10px]",
                                  "font-semibold",
                                  "text-gray-500",
                                  "dark:text-gray-400",
                                  "truncate",
                                )}
                              >
                                {tool.desc}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: Organize & Edit PDF */}
                    <div className={cn("space-y-3")}>
                      <h4
                        className={cn(
                          "text-xs",
                          "font-bold",
                          "text-gray-400",
                          "dark:text-gray-500",
                          "uppercase",
                          "tracking-wider",
                          "px-1",
                        )}
                      >
                        Edit & Organize
                      </h4>
                      <div className={cn("space-y-2.5")}>
                        {pdfEditTools.map((tool) => (
                          <Link
                            key={tool.title}
                            to="/pdf"
                            onClick={() => setIsToolsOpen(false)}
                            className={cn(
                              "flex",
                              "items-center",
                              "gap-2.5",
                              "p-2.5",
                              "rounded-2xl",
                              "border-2",
                              "border-gray-900",
                              "dark:border-gray-700",
                              "bg-[#fdfbf7]",
                              "dark:bg-[#1a1c22]",
                              "hover:bg-yellow-100",
                              "dark:hover:bg-[#252932]",
                              "hover:-translate-y-0.5",
                              "hover:shadow-[2px_2px_0_0_#111827]",
                              "dark:hover:shadow-[2px_2px_0_0_#000]",
                              "transition-all",
                              "group",
                            )}
                          >
                            <div
                              className={cn(
                                "flex",
                                "h-9",
                                "w-9",
                                "shrink-0",
                                "items-center",
                                "justify-center",
                                "rounded-xl",
                                "border-2",
                                "border-gray-900",
                                "dark:border-gray-700",
                                "shadow-[1px_1px_0_0_#111827]",
                                "dark:shadow-[1px_1px_0_0_#000]",
                                tool.bg,
                                "group-hover:scale-105",
                                "transition-transform",
                              )}
                            >
                              <tool.icon
                                className={cn("h-4", "w-4", "text-gray-900")}
                              />
                            </div>
                            <div className={cn("min-w-0")}>
                              <div
                                className={cn(
                                  "text-xs",
                                  "font-bold",
                                  "text-gray-900",
                                  "dark:text-white",
                                  "truncate",
                                )}
                              >
                                {tool.title}
                              </div>
                              <div
                                className={cn(
                                  "text-[10px]",
                                  "font-semibold",
                                  "text-gray-500",
                                  "dark:text-gray-400",
                                  "truncate",
                                )}
                              >
                                {tool.desc}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: AI Media Tools */}
                    <div className={cn("space-y-3")}>
                      <h4
                        className={cn(
                          "text-xs",
                          "font-bold",
                          "text-gray-400",
                          "dark:text-gray-500",
                          "uppercase",
                          "tracking-wider",
                          "px-1",
                        )}
                      >
                        AI Tools
                      </h4>
                      <div className={cn("space-y-2.5")}>
                        {aiMediaTools.map((tool) => (
                          <Link
                            key={tool.title}
                            to="/media-tools"
                            onClick={() => setIsToolsOpen(false)}
                            className={cn(
                              "flex",
                              "items-center",
                              "gap-2.5",
                              "p-2.5",
                              "rounded-2xl",
                              "border-2",
                              "border-gray-900",
                              "dark:border-gray-700",
                              "bg-[#fdfbf7]",
                              "dark:bg-[#1a1c22]",
                              "hover:bg-yellow-100",
                              "dark:hover:bg-[#252932]",
                              "hover:-translate-y-0.5",
                              "hover:shadow-[2px_2px_0_0_#111827]",
                              "dark:hover:shadow-[2px_2px_0_0_#000]",
                              "transition-all",
                              "group",
                            )}
                          >
                            <div
                              className={cn(
                                "flex",
                                "h-9",
                                "w-9",
                                "shrink-0",
                                "items-center",
                                "justify-center",
                                "rounded-xl",
                                "border-2",
                                "border-gray-900",
                                "dark:border-gray-700",
                                "shadow-[1px_1px_0_0_#111827]",
                                "dark:shadow-[1px_1px_0_0_#000]",
                                tool.bg,
                                "group-hover:scale-105",
                                "transition-transform",
                              )}
                            >
                              <tool.icon
                                className={cn("h-4", "w-4", "text-gray-900")}
                              />
                            </div>
                            <div className={cn("min-w-0")}>
                              <div
                                className={cn(
                                  "text-xs",
                                  "font-bold",
                                  "text-gray-900",
                                  "dark:text-white",
                                  "truncate",
                                )}
                              >
                                {tool.title}
                              </div>
                              <div
                                className={cn(
                                  "text-[10px]",
                                  "font-semibold",
                                  "text-gray-500",
                                  "dark:text-gray-400",
                                  "truncate",
                                )}
                              >
                                {tool.desc}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Column 4: More Utilities */}
                    <div className={cn("space-y-3")}>
                      <h4
                        className={cn(
                          "text-xs",
                          "font-bold",
                          "text-gray-400",
                          "dark:text-gray-500",
                          "uppercase",
                          "tracking-wider",
                          "px-1",
                        )}
                      >
                        Utilities
                      </h4>
                      <div className={cn("space-y-2.5")}>
                        {generalTools.map((tool) => (
                          <Link
                            key={tool.title}
                            to={
                              tool.title === "Unit Converters"
                                ? "/converters"
                                : "/media-tools"
                            }
                            onClick={() => setIsToolsOpen(false)}
                            className={cn(
                              "flex",
                              "items-center",
                              "gap-2.5",
                              "p-2.5",
                              "rounded-2xl",
                              "border-2",
                              "border-gray-900",
                              "dark:border-gray-700",
                              "bg-[#fdfbf7]",
                              "dark:bg-[#1a1c22]",
                              "hover:bg-yellow-100",
                              "dark:hover:bg-[#252932]",
                              "hover:-translate-y-0.5",
                              "hover:shadow-[2px_2px_0_0_#111827]",
                              "dark:hover:shadow-[2px_2px_0_0_#000]",
                              "transition-all",
                              "group",
                            )}
                          >
                            <div
                              className={cn(
                                "flex",
                                "h-9",
                                "w-9",
                                "shrink-0",
                                "items-center",
                                "justify-center",
                                "rounded-xl",
                                "border-2",
                                "border-gray-900",
                                "dark:border-gray-700",
                                "shadow-[1px_1px_0_0_#111827]",
                                "dark:shadow-[1px_1px_0_0_#000]",
                                tool.bg,
                                "group-hover:scale-105",
                                "transition-transform",
                              )}
                            >
                              <tool.icon
                                className={cn("h-4", "w-4", "text-gray-900")}
                              />
                            </div>
                            <div className={cn("min-w-0")}>
                              <div
                                className={cn(
                                  "text-xs",
                                  "font-bold",
                                  "text-gray-900",
                                  "dark:text-white",
                                  "truncate",
                                )}
                              >
                                {tool.title}
                              </div>
                              <div
                                className={cn(
                                  "text-[10px]",
                                  "font-semibold",
                                  "text-gray-500",
                                  "dark:text-gray-400",
                                  "truncate",
                                )}
                              >
                                {tool.desc}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vertical divider */}
          <div
            className={cn(
              "h-4",
              "w-px",
              "bg-gray-300",
              "dark:bg-gray-700",
              "mx-1.5",
            )}
          />

          <Link
            to="/pdf"
            className={cn(
              "px-3",
              "py-2",
              "rounded-xl",
              "font-bold",
              "text-sm",
              "text-gray-900",
              "dark:text-gray-100",
              "hover:text-purple-600",
              "dark:hover:text-purple-400",
              "hover:bg-gray-100",
              "dark:hover:bg-[#1e222a]",
              "transition-all",
            )}
          >
            PDF
          </Link>
          <Link
            to="/media-tools"
            className={cn(
              "px-3",
              "py-2",
              "rounded-xl",
              "font-bold",
              "text-sm",
              "text-gray-900",
              "dark:text-gray-100",
              "hover:text-purple-600",
              "dark:hover:text-purple-400",
              "hover:bg-gray-100",
              "dark:hover:bg-[#1e222a]",
              "transition-all",
            )}
          >
            Image
          </Link>
          <Link
            to="/media-tools"
            className={cn(
              "px-3",
              "py-2",
              "rounded-xl",
              "font-bold",
              "text-sm",
              "text-gray-900",
              "dark:text-gray-100",
              "hover:text-purple-600",
              "dark:hover:text-purple-400",
              "hover:bg-gray-100",
              "dark:hover:bg-[#1e222a]",
              "transition-all",
            )}
          >
            Convert
          </Link>
        </nav>

        {/* 3. Right: Actions */}
        <div
          className={cn(
            "flex",
            "items-center",
            "justify-end",
            "gap-3",
            "shrink-0",
          )}
        >
          <button
            id="theme-toggle"
            onClick={toggleTheme}
            className={cn(
              "cursor-pointer",
              "flex",
              "h-11",
              "w-11",
              "shrink-0",
              "items-center",
              "justify-center",
              "rounded-xl",
              "border-3",
              "border-gray-900",
              "bg-emerald-400",
              "text-gray-900",
              "transition-all",
              "hover:-translate-y-1",
              "hover:shadow-[4px_4px_0_0_#111827]",
            )}
          >
            {theme === "light" ? (
              <Moon className={cn("h-5", "w-5", "font-bold")} />
            ) : (
              <Sun className={cn("h-5", "w-5", "font-bold")} />
            )}
          </button>

          <Link
            to="/login"
            className={cn(
              "flex",
              "h-11",
              "items-center",
              "justify-center",
              "shrink-0",
              "px-5",
              "rounded-xl",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
              "font-bold",
              "text-gray-900",
              "dark:text-white",
              "bg-white",
              "dark:bg-[#1a1c22]",
              "hover:bg-gray-50",
              "dark:hover:bg-gray-800",
              "hover:-translate-y-1",
              "hover:shadow-[4px_4px_0_0_#111827]",
              "dark:hover:shadow-[4px_4px_0_0_#000]",
              "transition-all",
            )}
          >
            Login
          </Link>
          <Link
            to="/register"
            className={cn(
              "flex",
              "h-11",
              "items-center",
              "justify-center",
              "shrink-0",
              "px-5",
              "rounded-xl",
              "border-3",
              "border-gray-900",
              "font-bold",
              "text-gray-900",
              "bg-purple-400",
              "hover:bg-purple-500",
              "hover:-translate-y-1",
              "hover:shadow-[4px_4px_0_0_#111827]",
              "transition-all",
            )}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
