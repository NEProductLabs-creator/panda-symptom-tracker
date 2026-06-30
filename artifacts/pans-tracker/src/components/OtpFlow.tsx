import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { track } from "@/lib/analytics";
import { useDemoContext } from "@/contexts/DemoContext";

const DEMO_OTP_CODE = "123456";

// ─── 6-digit code input ────────────────────────────────────────────────────────

interface OtpCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpCodeInput({ value, onChange, disabled, autoFocus }: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function focusAt(i: number) {
    inputRefs.current[Math.max(0, Math.min(5, i))]?.focus();
  }

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? digit : d));
    const joined = next.join("");
    onChange(joined);
    if (digit && i < 5) focusAt(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        const next = digits.map((d, idx) => (idx === i ? "" : d));
        onChange(next.join(""));
      } else if (i > 0) {
        const next = digits.map((d, idx) => (idx === i - 1 ? "" : d));
        onChange(next.join(""));
        focusAt(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      focusAt(i + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
    onChange(next.join(""));
    focusAt(Math.min(pasted.length, 5));
  }

  return (
    <div className="flex gap-2 justify-center" role="group" aria-label="One-time sign-in code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of 6`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={[
            "w-10 h-12 sm:w-11 text-center text-xl font-semibold rounded-lg border-2 outline-none transition-all",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            digit ? "border-primary/50 bg-primary/5" : "border-border bg-white",
            disabled ? "opacity-50" : "",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── OTP auth flow ─────────────────────────────────────────────────────────────

interface OtpFlowProps {
  mode: "sign-in" | "sign-up";
  onBack: () => void;
}

export function OtpFlow({ mode, onBack }: OtpFlowProps) {
  const { isDemoMode } = useDemoContext();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"send-email" | "enter-code">("send-email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function startCooldown() {
    setCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (sending || cooldown > 0) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSending(true);

    const emailDomain = email.split("@")[1] ?? "unknown";

    try {
      if (!isDemoMode) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (otpError) {
          if (otpError.status === 429) {
            setError("Too many tries. Please wait a few minutes before requesting another code.");
            track("otp_code_failed", { reason: "rate_limited" });
          } else {
            setError("We could not send the code. Check your connection and try again.");
            track("otp_code_failed", { reason: "network" });
          }
          return;
        }
      }

      track("otp_code_requested", { email_domain: emailDomain });
      setCode("");
      setStep("enter-code");
      startCooldown();
    } catch {
      setError("We could not reach our servers. Check your connection and try again.");
      track("otp_code_failed", { reason: "network" });
    } finally {
      setSending(false);
    }
  }

  async function doVerify(currentCode: string) {
    if (verifying) return;
    setError("");
    setVerifying(true);

    try {
      if (isDemoMode) {
        if (currentCode === DEMO_OTP_CODE) {
          track("otp_code_verified");
          navigate("/");
        } else {
          setError("That code did not work. Try entering it again or send a new one.");
          track("otp_code_failed", { reason: "invalid" });
        }
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: currentCode,
        type: "email",
      });

      if (verifyError) {
        const msg = verifyError.message?.toLowerCase() ?? "";
        if (verifyError.status === 429) {
          setError("Too many tries. Please wait a few minutes before requesting another code.");
          track("otp_code_failed", { reason: "rate_limited" });
        } else if (msg.includes("expired")) {
          setError("That code did not work. Try entering it again or send a new one.");
          track("otp_code_failed", { reason: "expired" });
        } else if (msg.includes("invalid") || msg.includes("incorrect") || msg.includes("otp")) {
          setError("That code did not work. Try entering it again or send a new one.");
          track("otp_code_failed", { reason: "invalid" });
        } else {
          setError("We could not reach our servers. Check your connection and try again.");
          track("otp_code_failed", { reason: "network" });
        }
        return;
      }

      track("otp_code_verified");
      // Session is now established — AuthContext's onAuthStateChange fires SIGNED_IN
      // and the app routing (terms gate → journey routing) takes over automatically.
    } catch {
      setError("We could not reach our servers. Check your connection and try again.");
      track("otp_code_failed", { reason: "network" });
    } finally {
      setVerifying(false);
    }
  }

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    setError("");
    if (newCode.length === 6 && !verifying) {
      void doVerify(newCode);
    }
  }

  if (step === "send-email") {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="otp-email"
            className="text-xs font-semibold uppercase tracking-wide text-foreground"
          >
            Email
          </label>
          <input
            id="otp-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="you@example.com"
            className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
        </div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send sign-in code"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
        >
          Use password instead
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">Check your email</p>
        <p className="text-xs text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {isDemoMode && (
        <div
          role="status"
          className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-800 text-center"
        >
          Demo mode — use code{" "}
          <span className="font-bold tracking-[0.2em]">{DEMO_OTP_CODE}</span>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); void doVerify(code); }}
        className="space-y-4"
      >
        <OtpCodeInput
          value={code}
          onChange={handleCodeChange}
          disabled={verifying}
          autoFocus
        />

        {error && (
          <p role="alert" className="text-xs text-destructive text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={verifying || code.length < 6}
          className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {verifying ? "Verifying…" : "Verify code"}
        </button>
      </form>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <button
          type="button"
          onClick={onBack}
          className="hover:text-foreground transition-colors"
        >
          ← Use password instead
        </button>
        {cooldown > 0 ? (
          <span>Resend in {cooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={() => void handleSendCode()}
            className="text-primary hover:underline font-medium"
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}
