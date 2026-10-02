import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password!");
      return;
    }

    setIsLoading(true);
    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Successfully signed in! Welcome back to OmniFile.");
      navigate("/dashboard");
    }, 1200);
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Simulate Google OAuth popup/redirect
    setTimeout(() => {
      setIsGoogleLoading(false);
      toast.success("Successfully authenticated with Google account!");
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div
      className={cn(
        "relative",
        "flex",
        "items-center",
        "justify-center",
        "min-h-[calc(100vh-140px)]",
        "py-10",
        "px-4",
      )}
    >
      {/* Decorative Background Accents */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute",
          "inset-0",
          "pointer-events-none",
          "overflow-hidden",
          "-z-10",
        )}
      >
        <div
          className={cn(
            "absolute",
            "top-1/4",
            "-left-20",
            "w-72",
            "h-72",
            "rounded-full",
            "bg-yellow-300/15",
            "dark:bg-yellow-500/10",
            "blur-3xl",
          )}
        />
        <div
          className={cn(
            "absolute",
            "bottom-1/4",
            "-right-20",
            "w-72",
            "h-72",
            "rounded-full",
            "bg-purple-400/15",
            "dark:bg-purple-600/10",
            "blur-3xl",
          )}
        />
      </div>

      <div className={cn("w-full", "max-w-md")}>
        {/* Main Card (Neobrutalism Pro Max) */}
        <div
          className={cn(
            "relative",
            "bg-white",
            "dark:bg-[#16181d]",
            "border-3",
            "border-gray-900",
            "dark:border-gray-700",
            "rounded-3xl",
            "p-6",
            "sm:p-9",
            "shadow-[8px_8px_0_0_#111827]",
            "dark:shadow-[8px_8px_0_0_#000]",
            "transition-all",
          )}
        >
          <h1
            className={cn(
              "text-3xl",
              "sm:text-4xl",
              "font-bold",
              "text-gray-900",
              "dark:text-white",
              "tracking-tight",
            )}
          >
            Sign in to Account
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
            Access all powerful file & media tools without limits.
          </p>

          {/* Google Sign In Button */}
          <div className={cn("mt-6")}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className={cn(
                "w-full",
                "flex",
                "items-center",
                "justify-center",
                "gap-3",
                "py-3.5",
                "px-5",
                "rounded-2xl",
                "border-3",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-white",
                "dark:bg-[#1f2229]",
                "font-bold",
                "text-sm",
                "text-gray-900",
                "dark:text-white",
                "shadow-[4px_4px_0_0_#111827]",
                "dark:shadow-[4px_4px_0_0_#000]",
                "hover:-translate-y-1",
                "hover:shadow-[6px_6px_0_0_#111827]",
                "dark:hover:shadow-[6px_6px_0_0_#000]",
                "active:translate-y-0",
                "active:shadow-[2px_2px_0_0_#111827]",
                "transition-all",
                "duration-150",
                "disabled:opacity-60",
                "disabled:pointer-events-none",
                "cursor-pointer",
              )}
            >
              {isGoogleLoading ? (
                <div
                  className={cn(
                    "w-5",
                    "h-5",
                    "border-2",
                    "border-gray-900",
                    "border-t-transparent",
                    "rounded-full",
                    "animate-spin",
                  )}
                />
              ) : (
                <svg
                  className={cn("w-5", "h-5", "shrink-0")}
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div
            className={cn(
              "relative",
              "flex",
              "items-center",
              "justify-center",
              "my-6",
            )}
          >
            <div
              className={cn(
                "w-full",
                "border-t-2",
                "border-dashed",
                "border-gray-300",
                "dark:border-gray-700",
              )}
            />
            <span
              className={cn(
                "absolute",
                "bg-white",
                "dark:bg-[#16181d]",
                "px-3",
                "text-xs",
                "font-bold",
                "uppercase",
                "tracking-wider",
                "text-gray-500",
                "dark:text-gray-400",
              )}
            >
              or with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={cn("space-y-4")}>
            {/* Email Field */}
            <div className={cn("space-y-1.5")}>
              <label
                htmlFor="login-email"
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
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                required
                className={cn(
                  "w-full",
                  "py-3.5",
                  "px-4.5",
                  "rounded-2xl",
                  "border-3",
                  "border-gray-900",
                  "dark:border-gray-700",
                  "bg-gray-50",
                  "dark:bg-[#1e222a]",
                  "text-sm",
                  "font-semibold",
                  "text-gray-900",
                  "dark:text-white",
                  "placeholder:text-gray-400",
                  "focus:outline-none",
                  "focus:bg-white",
                  "dark:focus:bg-[#252932]",
                  "focus:border-gray-900",
                  "focus:ring-2",
                  "focus:ring-yellow-400",
                  "transition-all",
                )}
              />
            </div>

            {/* Password Field */}
            <div className={cn("space-y-1.5")}>
              <div className={cn("flex", "items-center", "justify-between")}>
                <label
                  htmlFor="login-password"
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
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info(
                      "Password reset feature will be available soon.",
                    );
                  }}
                  className={cn(
                    "text-xs",
                    "font-bold",
                    "text-purple-600",
                    "dark:text-purple-400",
                    "hover:underline",
                  )}
                >
                  Forgot password?
                </a>
              </div>
              <div className={cn("relative")}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className={cn(
                    "w-full",
                    "py-3.5",
                    "pl-4.5",
                    "pr-12",
                    "rounded-2xl",
                    "border-3",
                    "border-gray-900",
                    "dark:border-gray-700",
                    "bg-gray-50",
                    "dark:bg-[#1e222a]",
                    "text-sm",
                    "font-semibold",
                    "text-gray-900",
                    "dark:text-white",
                    "placeholder:text-gray-400",
                    "focus:outline-none",
                    "focus:bg-white",
                    "dark:focus:bg-[#252932]",
                    "focus:border-gray-900",
                    "focus:ring-2",
                    "focus:ring-yellow-400",
                    "transition-all",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn(
                    "absolute",
                    "right-4",
                    "top-1/2",
                    "-translate-y-1/2",
                    "text-gray-400",
                    "hover:text-gray-700",
                    "dark:hover:text-gray-200",
                    "transition-colors",
                  )}
                >
                  {showPassword ? (
                    <EyeOff className={cn("w-5", "h-5")} />
                  ) : (
                    <Eye className={cn("w-5", "h-5")} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className={cn("flex", "items-center", "gap-2.5", "pt-1")}>
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={cn(
                  "w-5",
                  "h-5",
                  "rounded-md",
                  "border-2",
                  "border-gray-900",
                  "dark:border-gray-600",
                  "flex",
                  "items-center",
                  "justify-center",
                  "transition-all",
                  rememberMe
                    ? "bg-yellow-400 dark:bg-yellow-400 text-gray-900"
                    : "bg-white dark:bg-[#1a1c22]",
                )}
              >
                {rememberMe && (
                  <CheckCircle2 className={cn("w-4", "h-4", "stroke-3")} />
                )}
              </button>
              <span
                onClick={() => setRememberMe(!rememberMe)}
                className={cn(
                  "text-xs",
                  "font-bold",
                  "text-gray-700",
                  "dark:text-gray-300",
                  "cursor-pointer",
                  "select-none",
                )}
              >
                Remember me on this device
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className={cn(
                "w-full",
                "flex",
                "items-center",
                "justify-center",
                "gap-2",
                "py-3.5",
                "px-6",
                "rounded-2xl",
                "border-3",
                "border-gray-900",
                "dark:border-gray-700",
                "bg-yellow-400",
                "hover:bg-yellow-500",
                "font-bold",
                "text-sm",
                "text-gray-900",
                "shadow-[4px_4px_0_0_#111827]",
                "dark:shadow-[4px_4px_0_0_#000]",
                "hover:-translate-y-1",
                "hover:shadow-[6px_6px_0_0_#111827]",
                "dark:hover:shadow-[6px_6px_0_0_#000]",
                "active:translate-y-0",
                "active:shadow-[2px_2px_0_0_#111827]",
                "transition-all",
                "duration-150",
                "disabled:opacity-60",
                "disabled:pointer-events-none",
                "mt-2",
                "cursor-pointer",
              )}
            >
              {isLoading ? (
                <div
                  className={cn(
                    "w-5",
                    "h-5",
                    "border-3",
                    "border-gray-900",
                    "border-t-transparent",
                    "rounded-full",
                    "animate-spin",
                  )}
                />
              ) : (
                <>
                  <span>Sign In Now</span>
                  <ArrowRight className={cn("w-4", "h-4")} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div
            className={cn(
              "mt-6",
              "text-center",
              "pt-4",
              "border-t-2",
              "border-gray-100",
              "dark:border-gray-800",
            )}
          >
            <p
              className={cn(
                "text-xs",
                "font-bold",
                "text-gray-600",
                "dark:text-gray-400",
              )}
            >
              Don't have an account?{" "}
              <Link
                to="/register"
                className={cn(
                  "text-purple-600",
                  "dark:text-purple-400",
                  "hover:underline",
                  "font-extrabold",
                  "ml-1",
                )}
              >
                Sign Up for Free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
