import { useCurrentUser, useLogoutMutation } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import {
  Bot,
  Crop,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Minimize2,
  Moon,
  Music,
  ScanText,
  Scissors,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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

const pdfTools = [...pdfConvertTools, ...pdfEditTools];

const aiMediaTools = [
  {
    title: "AI Assistant",
    desc: "Chat & tanya dokumen",
    icon: Bot,
    bg: "bg-indigo-300",
  },
];

const imageTools = [
  {
    title: "Image Converter",
    desc: "Konversi format gambar",
    icon: ImageIcon,
    bg: "bg-emerald-300",
    tab: "convert",
  },
  {
    title: "Upscale Image",
    desc: "Naikkan resolusi foto",
    icon: Sparkles,
    bg: "bg-amber-300",
    tab: "upscale",
  },
  {
    title: "Compress Image",
    desc: "Kecilkan ukuran gambar",
    icon: Minimize2,
    bg: "bg-rose-300",
    tab: "compress",
  },
  {
    title: "Crop Image",
    desc: "Potong dan rapikan foto",
    icon: Crop,
    bg: "bg-teal-300",
    tab: "crop",
  },
  {
    title: "Remove Background",
    desc: "Hapus background foto",
    icon: Scissors,
    bg: "bg-purple-300",
    tab: "remove-bg",
  },
];

const generalTools = [
  {
    title: "Audio Converter",
    desc: "Ubah format audio/musik",
    icon: Music,
    bg: "bg-blue-300",
  },
];

export default function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useCurrentUser();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logoutMutation = useLogoutMutation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolsRef.current &&
        !toolsRef.current.contains(event.target as Node)
      ) {
        setIsToolsOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isToolsOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isToolsOpen]);

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
                  "w-[760px]",
                  "max-w-[calc(100vw-2rem)]",
                  "max-h-[calc(100vh-7rem)]",
                  "overflow-y-auto",
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
                    className={cn("grid", "grid-cols-2", "gap-5", "text-left")}
                  >
                    {/* Cluster: PDF Tools */}
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
                        PDF Tools
                      </h4>
                      <div className={cn("space-y-2.5")}>
                        {pdfTools.map((tool) => (
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
                    <div className={cn("hidden")}>
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

                    {/* Cluster: Image Tools */}
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
                        Image Tools
                      </h4>
                      <div className={cn("space-y-2.5")}>
                        {imageTools.map((tool) => (
                          <Link
                            key={tool.title}
                            to="/image"
                            state={{ mediaTab: tool.tab }}
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
                              <tool.icon className={cn("h-4", "w-4", "text-gray-900")} />
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

                    {/* Hidden from the Tools cluster: AI Media Tools */}
                    <div className={cn("hidden")}>
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
                            to="/image"
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

                    {/* Hidden from the Tools cluster: Utilities */}
                    <div className={cn("hidden")}>
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
                            to="/audio"
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
            to="/image"
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
            to="/audio"
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
            Audio
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
              "transition-colors",
            )}
          >
            {theme === "light" ? (
              <Moon className={cn("h-5", "w-5", "font-bold")} />
            ) : (
              <Sun className={cn("h-5", "w-5", "font-bold")} />
            )}
          </button>

          {isAuthenticated && user ? (
            <div ref={userMenuRef} className={cn("relative")}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                title={user.email}
                className={cn(
                  "flex",
                  "h-11",
                  "w-11",
                  "shrink-0",
                  "items-center",
                  "justify-center",
                  "rounded-xl",
                  "border-3",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "bg-purple-400",
                  "dark:bg-purple-500/30",
                  "text-gray-900",
                  "dark:text-purple-200",
                  "font-black",
                  "text-sm",
                  "uppercase",
                  "cursor-pointer",
                )}
              >
                {user.name
                  ? user.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                  : user.email[0].toUpperCase()}
              </button>

              {isUserMenuOpen && (
                <div
                  className={cn(
                    "absolute",
                    "right-0",
                    "top-14",
                    "w-48",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-white",
                    "dark:bg-[#1a1c22]",
                    "shadow-[6px_6px_0_0_#111827]",
                    "dark:shadow-[6px_6px_0_0_#000]",
                    "p-2",
                    "z-50",
                  )}
                >
                  <div
                    className={cn(
                      "px-3",
                      "py-2",
                      "text-xs",
                      "font-bold",
                      "text-gray-500",
                      "dark:text-gray-400",
                      "truncate",
                    )}
                  >
                    {user.email}
                  </div>
                  <div
                    className={cn(
                      "h-0.5",
                      "bg-gray-200",
                      "dark:bg-gray-700",
                      "my-1",
                    )}
                  />
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logoutMutation.mutate();
                    }}
                    disabled={logoutMutation.isPending}
                    className={cn(
                      "w-full",
                      "flex",
                      "items-center",
                      "gap-2",
                      "px-3",
                      "py-2.5",
                      "rounded-xl",
                      "text-sm",
                      "font-bold",
                      "text-rose-600",
                      "dark:text-rose-400",
                      "hover:bg-rose-50",
                      "dark:hover:bg-rose-500/10",
                      "transition-colors",
                      "cursor-pointer",
                      logoutMutation.isPending && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                state={{ backgroundLocation: location }}
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
                state={{ backgroundLocation: location }}
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
