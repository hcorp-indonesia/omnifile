import { cn } from "@/lib/utils";
import {
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Music2,
  ScanText,
  Scissors,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface BurstItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  path: string;
  angle: number; // degrees
  distance: number; // pixels on desktop
  rotate: number; // visual tilt
}

const BURST_ITEMS: BurstItem[] = [
  {
    id: "pdf",
    label: "PDF",
    icon: FileText,
    bg: "bg-red-400",
    path: "/pdf",
    angle: -145,
    distance: 180,
    rotate: -12,
  },
  {
    id: "word",
    label: "Word",
    icon: FileText,
    bg: "bg-blue-400",
    path: "/pdf/pdf-to-word",
    angle: -110,
    distance: 235,
    rotate: -6,
  },
  {
    id: "excel",
    label: "Excel",
    icon: FileSpreadsheet,
    bg: "bg-emerald-400",
    path: "/pdf/pdf-to-excel",
    angle: -75,
    distance: 250,
    rotate: 8,
  },
  {
    id: "jpg",
    label: "JPG",
    icon: ImageIcon,
    bg: "bg-amber-400",
    path: "/pdf/pdf-to-jpg",
    angle: -40,
    distance: 240,
    rotate: 14,
  },
  {
    id: "png",
    label: "PNG",
    icon: ImageIcon,
    bg: "bg-sky-400",
    path: "/pdf/pdf-to-png",
    angle: -5,
    distance: 215,
    rotate: -9,
  },
  {
    id: "remove-bg",
    label: "Remove BG",
    icon: Scissors,
    bg: "bg-purple-400",
    path: "/image/remove-bg",
    angle: 30,
    distance: 220,
    rotate: 12,
  },
  {
    id: "upscale",
    label: "Upscale HD",
    icon: Maximize2,
    bg: "bg-amber-300",
    path: "/image/upscale",
    angle: 65,
    distance: 195,
    rotate: -15,
  },
  {
    id: "audio",
    label: "Audio",
    icon: Music2,
    bg: "bg-yellow-300",
    path: "/audio",
    angle: 120,
    distance: 175,
    rotate: 10,
  },
  {
    id: "compress",
    label: "Compress",
    icon: FileArchive,
    bg: "bg-rose-400",
    path: "/pdf/compress-pdf",
    angle: -180,
    distance: 205,
    rotate: 16,
  },
  {
    id: "ocr",
    label: "OCR Scan",
    icon: ScanText,
    bg: "bg-teal-400",
    path: "/pdf/ocr-pdf",
    angle: 165,
    distance: 185,
    rotate: -10,
  },
];

// Mini confetti shapes bursting out in 3D
const CONFETTI_PARTICLES = Array.from({ length: 16 }).map((_, i) => {
  const angle = (i / 16) * 360 + (i % 2 === 0 ? 12 : -15);
  const rad = (angle * Math.PI) / 180;
  const dist = 110 + (i % 4) * 35;
  const colors = [
    "bg-yellow-400",
    "bg-pink-400",
    "bg-purple-400",
    "bg-emerald-400",
    "bg-cyan-400",
    "bg-orange-400",
  ];
  return {
    id: i,
    x: Math.round(Math.cos(rad) * dist),
    y: Math.round(Math.sin(rad) * dist),
    color: colors[i % colors.length],
    size: (i % 3) + 6,
    rotate: (i * 47) % 360,
    delay: (i % 5) * 40,
  };
});

export default function ToolsBurst() {
  const [isOpen, setIsOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();

  // Screen resize handler to adjust particle radius
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate(path);
  };

  return (
    <span
      className={cn(
        "inline-flex",
        "items-center",
        "align-middle",
        "select-none",
      )}
    >
      <span
        ref={containerRef}
        className={cn("relative", "inline-block", "align-middle")}
        style={{ perspective: 1200 }}
      >
        {/* 3D Flying Burst Items */}
        {BURST_ITEMS.map((item, idx) => {
          const rad = (item.angle * Math.PI) / 180;
          const dist = isMobile ? item.distance * 0.62 : item.distance;
          const targetX = Math.round(Math.cos(rad) * dist);
          const targetY = Math.round(Math.sin(rad) * dist);

          // Stagger delay for fluid explosion wave
          const transitionDelay = isOpen
            ? `${idx * 28}ms`
            : `${(BURST_ITEMS.length - idx) * 15}ms`;

          return (
            <button
              key={item.id}
              type="button"
              onClick={(e) => handleItemClick(e, item.path)}
              title={`Open ${item.label}`}
              className={cn(
                "absolute",
                "top-1/2",
                "left-1/2",
                "z-40",
                "flex",
                "items-center",
                "gap-1.5",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "dark:border-white",
                "shadow-[3px_3px_0_0_#111827]",
                "dark:shadow-[3px_3px_0_0_#000]",
                item.bg,
                "px-2.5",
                "py-1",
                "text-xs",
                "font-black",
                "text-gray-900",
                "cursor-pointer",
                "whitespace-nowrap",
                "hover:scale-125",
                "hover:z-50",
                "hover:shadow-[5px_5px_0_0_#111827]",
                "active:scale-95",
              )}
              style={{
                transform: isOpen
                  ? `translate3d(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px), 0) rotate(${item.rotate}deg) scale(1)`
                  : "translate3d(-50%, -50%, 0) rotate(0deg) scale(0)",
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? "auto" : "none",
                transition: `transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) ${transitionDelay}, opacity 0.3s ease`,
              }}
            >
              <item.icon
                className={cn(
                  "h-3.5",
                  "w-3.5",
                  "text-gray-900",
                  "stroke-[2.5]",
                )}
              />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Confetti particles */}
        {CONFETTI_PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className={cn(
              "absolute",
              "top-1/2",
              "left-1/2",
              "rounded-md",
              "border",
              "border-gray-900/60",
              "pointer-events-none",
              "z-30",
              particle.color,
            )}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              transform: isOpen
                ? `translate3d(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px), 0) rotate(${particle.rotate}deg) scale(1)`
                : "translate3d(-50%, -50%, 0) rotate(0deg) scale(0)",
              opacity: isOpen ? 0.9 : 0,
              transition: `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${particle.delay}ms, opacity 0.4s ease`,
            }}
          />
        ))}

        {/* Shockwave Aura on Open */}
        <span
          className={cn(
            "absolute",
            "inset-0",
            "rounded-3xl",
            "bg-yellow-400/40",
            "pointer-events-none",
            "-z-10",
            "transition-all",
            "duration-500",
          )}
          style={{
            transform: isOpen ? "scale(1.4)" : "scale(0.8)",
            opacity: isOpen ? 0.6 : 0,
            filter: "blur(12px)",
          }}
        />

        {/* Fun Mascot Pop-out (Creator Face Jack-in-the-box) */}
        <div
          className={cn(
            "absolute",
            "bottom-full",
            "left-1/2",
            "z-20",
            "pointer-events-none",
            "select-none",
          )}
          style={{
            transform: isOpen
              ? "translate3d(-50%, -10px, 0) scale(1) rotate(-4deg)"
              : "translate3d(-50%, 45px, 0) scale(0) rotate(15deg)",
            opacity: isOpen ? 1 : 0,
            transition:
              "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
          }}
        >
          <div className="relative">
            <div
              className={cn(
                "h-24",
                "w-24",
                "sm:h-28",
                "sm:w-28",
                "rounded-full",
                "border-3",
                "border-gray-900",
                "dark:border-white",
                "bg-amber-100",
                "dark:bg-amber-900/60",
                "overflow-hidden",
                "shadow-[4px_4px_0_0_#111827]",
                "dark:shadow-[4px_4px_0_0_#FFE600]",
              )}
            >
              <img
                src="/people-1.png"
                alt="Creator Mascot"
                className={cn(
                  "h-full",
                  "w-full",
                  "object-cover",
                  "object-top",
                  "scale-110",
                )}
              />
            </div>

            {/* Funny Speech Bubble */}
            <span
              className={cn(
                "absolute",
                "-top-2",
                "-right-5",
                "rounded-xl",
                "border-2",
                "border-gray-900",
                "bg-yellow-300",
                "text-gray-900",
                "px-2",
                "py-0.5",
                "text-[11px]",
                "font-black",
                "shadow-[2px_2px_0_0_#111827]",
                "rotate-12",
                "whitespace-nowrap",
              )}
            >
              Ta-da! ✨
            </span>
          </div>
        </div>

        {/* Main Neo-brutalist "tools" Box */}
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "relative",
            "z-30",
            "inline-flex",
            "items-center",
            "bg-yellow-400",
            "text-gray-900",
            "border-3",
            "border-gray-900",
            "dark:border-white",
            "rounded-2xl",
            "px-3.5",
            "py-0.5",
            "sm:px-5",
            "sm:py-1",
            "shadow-[5px_5px_0_0_#111827]",
            "dark:shadow-[5px_5px_0_0_#facc15]",
            "cursor-pointer",
            "transition-all",
            "duration-200",
            isOpen
              ? "rotate-0 scale-105"
              : "-rotate-3 hover:-rotate-1 hover:scale-105",
            isShaking && "animate-bounce",
          )}
        >
          <span className={cn("font-black", "text-gray-900")}>tools</span>
        </button>
      </span>
    </span>
  );
}
