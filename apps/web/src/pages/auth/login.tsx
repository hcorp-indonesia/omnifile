import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/ui/otp-input";
import {
  useRequestLoginOTPMutation,
  useVerifyLoginOTPMutation,
} from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

type LoginStep = "email" | "otp";

export default function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendAfter, setResendAfter] = useState(0);
  const requestOTPMutation = useRequestLoginOTPMutation();
  const verifyOTPMutation = useVerifyLoginOTPMutation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (resendAfter <= 0) return;
    const timer = window.setInterval(() => {
      setResendAfter((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendAfter]);

  const requestOTP = (onSuccess?: () => void) => {
    requestOTPMutation.mutate(
      { email: email.trim().toLowerCase() },
      {
        onSuccess: (response) => {
          setEmail(response.data?.email || email.trim().toLowerCase());
          setResendAfter(response.data?.resend_after_seconds || 60);
          onSuccess?.();
        },
      },
    );
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestOTP(() => {
      setStep("otp");
      setCode("");
    });
  };

  const handleOTPSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    verifyOTPMutation.mutate(
      { email, code },
      { onSuccess: () => navigate("/dashboard", { replace: true }) },
    );
  };

  return (
    <div className={cn("relative", "w-full", "max-w-md", "py-6")}>
      <div
        aria-hidden="true"
        className={cn(
          "absolute",
          "-left-8",
          "-top-5",
          "h-24",
          "w-24",
          "rotate-6",
          "rounded-3xl",
          "border-3",
          "border-gray-900",
          "bg-yellow-300",
          "dark:border-gray-700",
          "dark:bg-yellow-500",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute",
          "-bottom-4",
          "-right-5",
          "h-20",
          "w-20",
          "-rotate-12",
          "rounded-full",
          "border-3",
          "border-gray-900",
          "bg-emerald-300",
          "dark:border-gray-700",
          "dark:bg-emerald-500",
        )}
      />

      <section
        className={cn(
          "relative",
          "overflow-hidden",
          "rounded-3xl",
          "border-3",
          "border-gray-900",
          "bg-white",
          "p-7",
          "shadow-[8px_8px_0_0_#111827]",
          "sm:p-9",
          "dark:border-gray-700",
          "dark:bg-[#16181d]",
          "dark:shadow-[8px_8px_0_0_#000]",
        )}
      >
        <h1
          className={cn(
            "text-3xl",
            "font-black",
            "tracking-tight",
            "text-gray-900",
            "dark:text-white",
          )}
        >
          {step === "email" ? "Sign in" : "Check your inbox"}
        </h1>

        {step === "email" ? (
          <form
            onSubmit={handleEmailSubmit}
            className={cn("mt-7", "space-y-5")}
          >
            <Input
              id="login-email"
              type="email"
              label="Email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              labelClassName={cn("font-black")}
            />
            <button
              type="submit"
              disabled={requestOTPMutation.isPending}
              className={cn(
                "w-full",
                "rounded-2xl",
                "border-3",
                "border-gray-900",
                "bg-yellow-400",
                "px-6",
                "py-3.5",
                "font-black",
                "text-gray-900",
                "shadow-[4px_4px_0_0_#111827]",
                "transition-all",
                "hover:-translate-y-1",
                "hover:bg-yellow-300",
                "hover:shadow-[6px_6px_0_0_#111827]",
                "active:translate-y-0",
                "disabled:pointer-events-none",
                "disabled:opacity-60",
              )}
            >
              {requestOTPMutation.isPending ? "Sending code..." : "Send"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOTPSubmit} className={cn("mt-7", "space-y-5")}>
            <OTPInput
              value={code}
              onChange={setCode}
              disabled={verifyOTPMutation.isPending}
              autoFocus
            />
            <button
              type="submit"
              disabled={verifyOTPMutation.isPending || code.length !== 6}
              className={cn(
                "w-full",
                "rounded-2xl",
                "border-3",
                "border-gray-900",
                "bg-purple-400",
                "px-6",
                "py-3.5",
                "font-black",
                "text-gray-900",
                "shadow-[4px_4px_0_0_#111827]",
                "transition-all",
                "hover:-translate-y-1",
                "hover:bg-purple-300",
                "hover:shadow-[6px_6px_0_0_#111827]",
                "active:translate-y-0",
                "disabled:pointer-events-none",
                "disabled:opacity-60",
              )}
            >
              {verifyOTPMutation.isPending ? "Verifying..." : "Verify"}
            </button>
            <div
              className={cn("flex", "items-center", "justify-between", "gap-3")}
            >
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                className={cn(
                  "inline-flex",
                  "items-center",
                  "gap-1.5",
                  "text-xs",
                  "font-bold",
                  "text-gray-600",
                  "hover:text-gray-900",
                  "dark:text-gray-400",
                  "dark:hover:text-white",
                )}
              >
                <ArrowLeft className={cn("h-4", "w-4")} />
                back
              </button>
              <button
                type="button"
                disabled={resendAfter > 0 || requestOTPMutation.isPending}
                onClick={() => requestOTP()}
                className={cn(
                  "text-xs",
                  "font-black",
                  "text-purple-700",
                  "hover:underline",
                  "disabled:text-gray-400",
                  "disabled:no-underline",
                  "dark:text-purple-300",
                )}
              >
                {resendAfter > 0 ? `Resend in ${resendAfter}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
