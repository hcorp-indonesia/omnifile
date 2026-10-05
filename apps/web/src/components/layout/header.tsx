import { useCurrentUser, useLogoutMutation } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import {
  Bot,
  Crop,
  FileArchive,
  FileMinus,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Lock,
  LogOut,
  Minimize2,
  Moon,
  Music,
  ScanText,
  Scissors,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

const pdfConvertTools = [
  {
    title: "PDF to Word",
    desc: "Convert PDF to DOCX",
    icon: FileText,
    bg: "bg-blue-300",
    href: "/pdf/pdf-to-word",
  },
  {
    title: "PDF to Excel",
    desc: "Extract tables to XLS",
    icon: FileSpreadsheet,
    bg: "bg-emerald-300",
    href: "/pdf/pdf-to-excel",
  },
  {
    title: "PDF to JPG",
    desc: "Save pages as JPG",
    icon: ImageIcon,
    bg: "bg-amber-300",
    href: "/pdf/pdf-to-jpg",
  },
];

const pdfEditTools = [
  {
    title: "Merge PDF",
    desc: "Merge multiple PDFs",
    icon: Layers,
    bg: "bg-purple-300",
    href: "/pdf/merge-pdf",
  },
  {
    title: "Split PDF",
    desc: "Split document pages",
    icon: Scissors,
    bg: "bg-pink-300",
    href: "/pdf/split-pdf",
  },
  {
    title: "Remove PDF",
    desc: "Delete unwanted pages",
    icon: FileMinus,
    bg: "bg-red-300",
    href: "/pdf/remove-pdf",
  },
  {
    title: "Compress PDF",
    desc: "Compress file size",
    icon: FileArchive,
    bg: "bg-red-300",
    href: "/pdf/compress-pdf",
  },
  {
    title: "OCR PDF",
    desc: "Extract text from scans",
    icon: ScanText,
    bg: "bg-teal-300",
    href: "/pdf/ocr-pdf",
  },
];

const pdfTools = [...pdfConvertTools, ...pdfEditTools];

const aiMediaTools = [
  {
    title: "AI Assistant",
    desc: "Chat & query documents",
    icon: Bot,
    bg: "bg-indigo-300",
  },
];

const imageTools = [
  {
    title: "Image Converter",
    desc: "Convert image formats",
    icon: ImageIcon,
    bg: "bg-emerald-300",
    tab: "convert",
    to: "/image/image-converter",
  },
  {
    title: "Upscale Image",
    desc: "Enhance photo resolution",
    icon: Sparkles,
    bg: "bg-amber-300",
    tab: "upscale",
    to: "/image/upscale",
  },
  {
    title: "Compress Image",
    desc: "Compress image size",
    icon: Minimize2,
    bg: "bg-rose-300",
    tab: "compress",
    to: "/image/compress",
  },
  {
    title: "Crop Image",
    desc: "Crop and frame photos",
    icon: Crop,
    bg: "bg-teal-300",
    tab: "crop",
    to: "/image/crop",
  },
  {
    title: "Remove Background",
    desc: "Remove photo background",
    icon: Scissors,
    bg: "bg-purple-300",
    tab: "remove-bg",
    to: "/image/remove-bg",
  },
];

const generalTools = [
  {
    title: "Audio Converter",
    desc: "Convert audio/music formats",
    icon: Music,
    bg: "bg-blue-300",
  },
];

export default function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
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
                            to={tool.href}
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
                            to={
                              tool.title === "Merge PDF"
                                ? "/pdf/merge-pdf"
                                : tool.title === "Split PDF"
                                  ? "/pdf/split-pdf"
                                  : tool.title === "Remove PDF"
                                    ? "/pdf/remove-pdf"
                                    : tool.title === "Compress PDF"
                                      ? "/pdf/compress-pdf"
                                      : "/pdf"
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
                            to={tool.to ?? "/image"}
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
              "flex",
              "items-center",
              "gap-1.5",
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
            {!isAuthenticated && (
              <Lock className="h-3 w-3 text-amber-500 stroke-[2.5]" />
            )}
          </Link>
          <Link
            to="/audio"
            className={cn(
              "flex",
              "items-center",
              "gap-1.5",
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
            {!isAuthenticated && (
              <Lock className="h-3 w-3 text-amber-500 stroke-[2.5]" />
            )}
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
              "rounded-full",
              "border-3",
              "border-gray-900",
              "dark:border-gray-700",
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
                  "rounded-full",
                  "border-3",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "bg-purple-400",
                  "text-gray-900",
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
                    "min-w-48",
                    "w-max",
                    "max-w-xs",
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
                      "text-left",
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm",
                        "font-bold",
                        "text-gray-900",
                        "dark:text-white",
                        "whitespace-nowrap",
                      )}
                    >
                      {user.email}
                    </div>
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
                      setIsSignOutModalOpen(true);
                    }}
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
                    )}
                  >
                    <LogOut className={cn("h-4", "w-4")} />
                    Sign Out
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
            </>
          )}
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {isSignOutModalOpen &&
        createPortal(
          <div
            className={cn(
              "fixed",
              "inset-0",
              "z-100",
              "flex",
              "items-center",
              "justify-center",
              "p-4",
              "bg-black/60",
              "backdrop-blur-xs",
              "animate-in",
              "fade-in",
              "duration-150",
            )}
            onClick={() => {
              if (!logoutMutation.isPending) setIsSignOutModalOpen(false);
            }}
          >
            <div
              className={cn(
                "w-full",
                "max-w-md",
                "bg-white",
                "dark:bg-[#1a1c22]",
                "border-3",
                "border-gray-900",
                "dark:border-gray-700",
                "rounded-3xl",
                "p-6",
                "shadow-[8px_8px_0_0_#111827]",
                "dark:shadow-[8px_8px_0_0_#000]",
                "relative",
                "animate-in",
                "zoom-in-95",
                "duration-150",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(false)}
                disabled={logoutMutation.isPending}
                className={cn(
                  "absolute",
                  "top-4",
                  "right-4",
                  "h-8",
                  "w-8",
                  "rounded-full",
                  "border-2",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "flex",
                  "items-center",
                  "justify-center",
                  "text-gray-600",
                  "dark:text-gray-300",
                  "hover:bg-gray-100",
                  "dark:hover:bg-gray-800",
                  "cursor-pointer",
                  "transition-colors",
                )}
              >
                <X className={cn("h-4", "w-4")} />
              </button>

              <div
                className={cn(
                  "flex",
                  "flex-col",
                  "items-center",
                  "text-center",
                )}
              >
                <div
                  className={cn(
                    "h-16",
                    "w-16",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-rose-100",
                    "dark:bg-rose-950/50",
                    "text-rose-600",
                    "dark:text-rose-400",
                    "flex",
                    "items-center",
                    "justify-center",
                    "mb-4",
                    "shadow-[3px_3px_0_0_#111827]",
                    "dark:shadow-[3px_3px_0_0_#000]",
                  )}
                >
                  <LogOut className={cn("h-8", "w-8", "stroke-[2.5]")} />
                </div>

                <h3
                  className={cn(
                    "text-xl",
                    "font-black",
                    "text-gray-900",
                    "dark:text-white",
                    "mb-2",
                  )}
                >
                  Are you sure?
                </h3>
                <p
                  className={cn(
                    "text-sm",
                    "text-gray-600",
                    "dark:text-gray-400",
                    "mb-6",
                    "max-w-xs",
                  )}
                >
                  You will need to login again to access image and audio.
                </p>

                <div className={cn("flex", "w-full", "gap-3")}>
                  <button
                    type="button"
                    onClick={() => setIsSignOutModalOpen(false)}
                    disabled={logoutMutation.isPending}
                    className={cn(
                      "flex-1",
                      "py-3",
                      "px-4",
                      "rounded-xl",
                      "border-3",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "bg-gray-100",
                      "dark:bg-gray-800",
                      "text-gray-900",
                      "dark:text-white",
                      "font-bold",
                      "text-sm",
                      "hover:-translate-y-0.5",
                      "hover:shadow-[3px_3px_0_0_#111827]",
                      "dark:hover:shadow-[3px_3px_0_0_#000]",
                      "transition-all",
                      "cursor-pointer",
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logoutMutation.mutate(undefined, {
                        onSuccess: () => {
                          setIsSignOutModalOpen(false);
                        },
                      });
                    }}
                    disabled={logoutMutation.isPending}
                    className={cn(
                      "flex-1",
                      "py-3",
                      "px-4",
                      "rounded-xl",
                      "border-3",
                      "border-gray-900",
                      "dark:border-gray-700",
                      "bg-rose-500",
                      "hover:bg-rose-600",
                      "text-white",
                      "font-bold",
                      "text-sm",
                      "shadow-[3px_3px_0_0_#111827]",
                      "dark:shadow-[3px_3px_0_0_#000]",
                      "hover:-translate-y-0.5",
                      "hover:shadow-[4px_4px_0_0_#111827]",
                      "dark:hover:shadow-[4px_4px_0_0_#000]",
                      "transition-all",
                      "cursor-pointer",
                      "flex",
                      "items-center",
                      "justify-center",
                      "gap-2",
                      logoutMutation.isPending &&
                        "opacity-60 cursor-not-allowed",
                    )}
                  >
                    {logoutMutation.isPending
                      ? "Signing out..."
                      : "Yes, Sign Out"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
