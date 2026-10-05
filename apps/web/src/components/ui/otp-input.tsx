import { cn } from "@/lib/utils";
import { useRef } from "react";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  value,
  onChange,
  length = 6,
  label = "Login code",
  disabled = false,
  autoFocus = false,
}: OTPInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] || "");

  const updateDigits = (startIndex: number, rawValue: string) => {
    const incomingDigits = rawValue.replace(/\D/g, "");
    if (!incomingDigits) return;

    const nextDigits = [...digits];
    incomingDigits
      .slice(0, length - startIndex)
      .split("")
      .forEach((digit, offset) => {
        nextDigits[startIndex + offset] = digit;
      });

    onChange(nextDigits.join(""));
    const nextIndex = Math.min(startIndex + incomingDigits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
    inputRefs.current[nextIndex]?.select();
  };

  const clearDigit = (index: number) => {
    onChange(digits.slice(0, index).join(""));
  };

  return (
    <fieldset className={cn("w-full", "space-y-2")} disabled={disabled}>
      <div
        className={cn("grid", "grid-cols-6", "gap-1.5", "sm:gap-2.5")}
        role="group"
        aria-label={label}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            autoFocus={autoFocus && index === 0}
            maxLength={length}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              const incomingValue = event.target.value;
              if (incomingValue === "") {
                clearDigit(index);
                return;
              }
              updateDigits(index, incomingValue);
            }}
            onPaste={(event) => {
              event.preventDefault();
              updateDigits(0, event.clipboardData.getData("text"));
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace") {
                event.preventDefault();
                if (digits[index]) {
                  clearDigit(index);
                  return;
                }
                if (index > 0) {
                  clearDigit(index - 1);
                  inputRefs.current[index - 1]?.focus();
                }
              } else if (event.key === "ArrowLeft" && index > 0) {
                event.preventDefault();
                inputRefs.current[index - 1]?.focus();
              } else if (event.key === "ArrowRight" && index < length - 1) {
                event.preventDefault();
                inputRefs.current[index + 1]?.focus();
              }
            }}
            className={cn(
              "h-14",
              "min-w-0",
              "w-full",
              "rounded-xl",
              "border-3",
              "border-gray-900",
              "bg-gray-50",
              "text-center",
              "text-2xl",
              "font-black",
              "text-gray-900",
              "caret-purple-600",
              "outline-none",
              "transition-all",
              "duration-150",
              "focus:-translate-y-1",
              "focus:bg-white",
              "focus:ring-3",
              "focus:ring-purple-300",
              "focus:shadow-[3px_3px_0_0_#111827]",
              "disabled:cursor-not-allowed",
              "disabled:opacity-60",
              "dark:border-gray-700",
              "dark:bg-[#1e222a]",
              "dark:text-white",
              "dark:focus:bg-[#252932]",
              "dark:focus:ring-purple-500/50",
              "dark:focus:shadow-[3px_3px_0_0_#000]",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}
