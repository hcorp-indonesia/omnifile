import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  variant?: "default" | "interactive" | "elevated" | "flat";
  rounded?: "xl" | "2xl" | "3xl";
}

export const Card = React.forwardRef<HTMLElement, CardProps>(
  (
    {
      as: Component = "div",
      className,
      variant = "default",
      rounded = "3xl",
      children,
      ...props
    },
    ref
  ) => {
    const roundedStyles = {
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
      "3xl": "rounded-3xl",
    }[rounded];

    const variantStyles = {
      default: cn(
        "shadow-[4px_4px_0_0_#111827] dark:shadow-[4px_4px_0_0_#000]"
      ),
      interactive: cn(
        "cursor-pointer",
        "shadow-[4px_4px_0_0_#111827] dark:shadow-[4px_4px_0_0_#000]",
        "transition-all duration-200",
        "hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#111827] dark:hover:shadow-[8px_8px_0_0_#000]",
        "active:translate-y-0 active:shadow-[2px_2px_0_0_#111827] dark:active:shadow-[2px_2px_0_0_#000]"
      ),
      elevated: cn(
        "shadow-[8px_8px_0_0_#111827] dark:shadow-[8px_8px_0_0_#000]"
      ),
      flat: "",
    }[variant];

    return (
      <Component
        ref={ref}
        className={cn(
          "bg-white dark:bg-[#16181d]",
          "border-3 border-gray-900 dark:border-gray-700",
          roundedStyles,
          variantStyles,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6 sm:p-8", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}
export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = "h3", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "font-bold text-gray-900 dark:text-white tracking-tight leading-tight",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}
export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm font-semibold text-gray-600 dark:text-gray-400",
      className
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 sm:p-8 pt-0 sm:pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-6 sm:p-8 pt-0 sm:pt-0",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export interface CardBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "yellow" | "purple" | "mint" | "rose" | "blue";
}
export const CardBadge = React.forwardRef<HTMLSpanElement, CardBadgeProps>(
  ({ className, variant = "yellow", ...props }, ref) => {
    const variantBg = {
      yellow: "bg-amber-400 text-gray-900",
      purple: "bg-purple-300 text-purple-950",
      mint: "bg-emerald-300 text-emerald-950",
      rose: "bg-rose-300 text-rose-950",
      blue: "bg-blue-300 text-blue-950",
    }[variant];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5",
          "rounded-xl border-2 border-gray-900 dark:border-gray-700",
          "px-2.5 py-1 text-xs font-black tracking-wide uppercase",
          "shadow-[2px_2px_0_0_#111827] dark:shadow-[2px_2px_0_0_#000]",
          variantBg,
          className
        )}
        {...props}
      />
    );
  }
);
CardBadge.displayName = "CardBadge";
