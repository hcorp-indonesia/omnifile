import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { authService } from "@/service/auth-service";

export default function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset({ email });
      toast.success("If the email is registered, a reset link has been sent.");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex",
        "w-full",
        "items-center",
        "justify-center",
        "py-10",
      )}
    >
      <div
        className={cn(
          "w-full",
          "max-w-md",
          "rounded-3xl",
          "border-3",
          "border-gray-900",
          "bg-white",
          "p-6",
          "shadow-[8px_8px_0_0_#111827]",
          "dark:border-gray-700",
          "dark:bg-[#16181d]",
          "dark:shadow-[8px_8px_0_0_#000]",
          "sm:p-9",
        )}
      >
        <div
          className={cn(
            "mb-6",
            "flex",
            "h-14",
            "w-14",
            "items-center",
            "justify-center",
            "rounded-2xl",
            "border-3",
            "border-gray-900",
            "bg-yellow-400",
            "text-gray-900",
          )}
        >
          <Mail className={cn("h-7", "w-7")} />
        </div>

        <h1
          className={cn(
            "text-3xl",
            "font-bold",
            "tracking-tight",
            "text-gray-900",
            "dark:text-white",
          )}
        >
          Reset your password
        </h1>
        <p
          className={cn(
            "mt-2",
            "text-sm",
            "font-semibold",
            "text-gray-600",
            "dark:text-gray-400",
          )}
        >
          Enter your email and we will send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className={cn("mt-7", "space-y-4")}>
          <div className={cn("space-y-1.5")}>
            <label
              htmlFor="reset-email"
              className={cn(
                "block",
                "text-xs",
                "font-bold",
                "uppercase",
                "tracking-wider",
                "text-gray-900",
                "dark:text-gray-200",
              )}
            >
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className={cn(
                "w-full",
                "rounded-2xl",
                "border-3",
                "border-gray-900",
                "bg-gray-50",
                "px-4",
                "py-3.5",
                "text-sm",
                "font-semibold",
                "text-gray-900",
                "placeholder:text-gray-400",
                "focus:border-gray-900",
                "focus:bg-white",
                "focus:outline-none",
                "focus:ring-2",
                "focus:ring-yellow-400",
                "dark:border-gray-700",
                "dark:bg-[#1e222a]",
                "dark:text-white",
                "dark:focus:bg-[#252932]",
              )}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "flex",
              "w-full",
              "items-center",
              "justify-center",
              "gap-2",
              "rounded-2xl",
              "border-3",
              "border-gray-900",
              "bg-yellow-400",
              "px-6",
              "py-3.5",
              "font-bold",
              "text-sm",
              "text-gray-900",
              "shadow-[4px_4px_0_0_#111827]",
              "transition-transform",
              "hover:-translate-y-1",
              "hover:bg-yellow-500",
              "hover:shadow-[6px_6px_0_0_#111827]",
              "dark:border-gray-700",
              "dark:shadow-[4px_4px_0_0_#000]",
              "disabled:cursor-not-allowed",
              "disabled:opacity-60",
              "cursor-pointer",
            )}
          >
            {isSubmitting ? "Sending..." : "Submit"}
          </button>
        </form>

        <Link
          to="/login"
          state={location.state}
          className={cn(
            "mt-6",
            "flex",
            "items-center",
            "justify-center",
            "gap-2",
            "text-xs",
            "font-extrabold",
            "text-purple-600",
            "hover:underline",
            "dark:text-purple-400",
          )}
        >
          <ArrowLeft className={cn("h-4", "w-4")} />
          Back to login
        </Link>
      </div>
    </div>
  );
}
