import { KeyRound, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { authService } from "@/service/auth-service";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!searchParams.get("token")) {
      toast.error("This reset link is invalid or incomplete.");
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.resetPassword({
        token: searchParams.get("token") ?? "",
        new_password: password,
        confirm_password: confirmPassword,
      });
      toast.success("Password updated successfully. Please sign in again.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("This reset link is invalid or has expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("flex", "w-full", "items-center", "justify-center", "py-10")}>
      <div className={cn("w-full", "max-w-md", "rounded-3xl", "border-3", "border-gray-900", "bg-white", "p-6", "shadow-[8px_8px_0_0_#111827]", "dark:border-gray-700", "dark:bg-[#16181d]", "dark:shadow-[8px_8px_0_0_#000]", "sm:p-9")}>
        <div className={cn("mb-6", "flex", "h-14", "w-14", "items-center", "justify-center", "rounded-2xl", "border-3", "border-gray-900", "bg-yellow-400", "text-gray-900")}>
          <KeyRound className={cn("h-7", "w-7")} />
        </div>
        <h1 className={cn("text-3xl", "font-bold", "tracking-tight", "text-gray-900", "dark:text-white")}>Create a new password</h1>
        <p className={cn("mt-2", "text-sm", "font-semibold", "text-gray-600", "dark:text-gray-400")}>Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit} className={cn("mt-7", "space-y-4")}>
          <label className={cn("block", "space-y-1.5")}>
            <span className={cn("block", "text-xs", "font-bold", "uppercase", "tracking-wider", "text-gray-900", "dark:text-gray-200")}>New password</span>
            <div className={cn("relative")}>
              <LockKeyhole className={cn("absolute", "left-4", "top-1/2", "h-5", "w-5", "-translate-y-1/2", "text-gray-400")} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className={cn("w-full", "rounded-2xl", "border-3", "border-gray-900", "bg-gray-50", "py-3.5", "pl-12", "pr-4", "font-semibold", "text-gray-900", "focus:outline-none", "focus:ring-2", "focus:ring-yellow-400", "dark:border-gray-700", "dark:bg-[#1e222a]", "dark:text-white")} />
            </div>
          </label>
          <label className={cn("block", "space-y-1.5")}>
            <span className={cn("block", "text-xs", "font-bold", "uppercase", "tracking-wider", "text-gray-900", "dark:text-gray-200")}>Confirm password</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} className={cn("w-full", "rounded-2xl", "border-3", "border-gray-900", "bg-gray-50", "px-4", "py-3.5", "font-semibold", "text-gray-900", "focus:outline-none", "focus:ring-2", "focus:ring-yellow-400", "dark:border-gray-700", "dark:bg-[#1e222a]", "dark:text-white")} />
          </label>
          <button type="submit" disabled={isSubmitting} className={cn("w-full", "rounded-2xl", "border-3", "border-gray-900", "bg-yellow-400", "px-6", "py-3.5", "font-bold", "text-gray-900", "shadow-[4px_4px_0_0_#111827]", "hover:-translate-y-1", "hover:bg-yellow-500", "disabled:cursor-not-allowed", "disabled:opacity-60", "dark:border-gray-700", "dark:shadow-[4px_4px_0_0_#000]")}>{isSubmitting ? "Updating..." : "Update password"}</button>
        </form>
        <Link to="/login" className={cn("mt-6", "block", "text-center", "text-xs", "font-extrabold", "text-purple-600", "hover:underline", "dark:text-purple-400")}>Back to login</Link>
      </div>
    </div>
  );
}
