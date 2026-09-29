"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkEmail, signInStudent, signInAdmin } from "@/lib/actions/auth";
import { ModalScene } from "@/components/illustrations";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = "email" | "password";

export function AuthModal({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setStep("email");
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
  }

  function finishLogin() {
    onClose();
    // Hard reload — the server-rendered page reads `getCurrentUser()`,
    // and the new session cookie wasn't present when this render started.
    window.location.reload();
    // router.refresh() alone re-runs the RSC but doesn't always pick up
    // the freshly-set cookie reliably across navigations.
    router.refresh();
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);

    const trimmed = email.trim();
    const check = await checkEmail(trimmed);

    if ("error" in check) {
      setError(check.error);
      setLoading(false);
      return;
    }

    if (check.mode === "admin") {
      setStep("password");
      setLoading(false);
      return;
    }

    const result = await signInStudent(trimmed);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    finishLogin();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError(null);

    const result = await signInAdmin(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    finishLogin();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onClick={() => {
        reset();
        onClose();
      }}
    >
      <div
        className="modal-pop w-full max-w-md overflow-hidden rounded-[22px] bg-paper shadow-[0_28px_72px_-16px_rgba(26,26,26,0.32)]"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalScene
          title="Katıl"
          onClose={() => {
            reset();
            onClose();
          }}
        />

        <div className="px-6 pb-7 pt-5">
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <div>
                <h2
                  id="auth-title"
                  className="font-heading text-[22px] font-bold tracking-tight text-ink"
                >
                  E-postayla giriş yap
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">
                  YTÜ öğrenci e-postanı (<strong>@std.yildiz.edu.tr</strong>)
                  gir.
                </p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                  E-posta adresi
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/50 focus:ring-2 focus:ring-ink/8"
                  placeholder="ad.soyad@std.yildiz.edu.tr"
                  required
                  autoFocus
                  disabled={loading}
                />
              </label>

              {error && (
                <p className="animate-slide-up text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-paper transition hover:bg-ink/85 active:scale-[0.97] active:transition-none disabled:bg-ink/30"
              >
                {loading ? (
                  <>
                    <Spinner /> Kontrol ediliyor…
                  </>
                ) : (
                  "Devam Et"
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handlePasswordSubmit}
              className="flex flex-col gap-4"
            >
              <div>
                <h2
                  id="auth-title"
                  className="font-heading text-[22px] font-bold tracking-tight text-ink"
                >
                  Admin şifresi
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">
                  <strong className="font-medium text-ink">
                    {email.trim()}
                  </strong>{" "}
                  admin hesabı olarak tanındı. Şifreni gir.
                </p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                  Şifre
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/50 focus:ring-2 focus:ring-ink/8"
                  placeholder="••••••••"
                  required
                  autoFocus
                  disabled={loading}
                />
              </label>

              {error && (
                <p className="animate-slide-up text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-paper transition hover:bg-ink/85 active:scale-[0.97] active:transition-none disabled:bg-ink/30"
              >
                {loading ? (
                  <>
                    <Spinner /> Doğrulanıyor…
                  </>
                ) : (
                  "Giriş Yap"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setPassword("");
                  setError(null);
                }}
                className="text-sm text-ink/45 transition hover:text-ink/70"
              >
                ← Farklı e-posta kullan
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
