"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/lib/actions/profile";
import { ModalScene, VehicleGlyph } from "@/components/illustrations";
import type { EquipmentNeed, VehicleType } from "@/lib/types";

type Props = {
  userId: string;
  email: string;
};

type EquipmentOption = {
  value: EquipmentNeed;
  label: string;
  sub: string;
  glyph: VehicleType | null;
};

const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  {
    value: "none",
    label: "Ekipmanım yok",
    sub: "Koşarım veya kendi aracım var",
    glyph: null,
  },
  {
    value: "bicycle",
    label: "Bisiklet",
    sub: "Müsait olursa atanır",
    glyph: "bicycle",
  },
  {
    value: "skates",
    label: "Paten",
    sub: "Müsait olursa atanır",
    glyph: "skates",
  },
  {
    value: "skateboard",
    label: "Kaykay",
    sub: "Müsait olursa atanır",
    glyph: "skateboard",
  },
];

export function OnboardingModal({ userId: _userId, email }: Props) {
  const router = useRouter();

  const [minimized, setMinimized] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [equipmentNeed, setEquipmentNeed] = useState<EquipmentNeed | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    function onOpen() {
      setMinimized(false);
    }
    window.addEventListener("open-onboarding", onOpen);
    return () => window.removeEventListener("open-onboarding", onOpen);
  }, []);

  const canAdvance = fullName.trim().length > 1 && phone.trim().length >= 10;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function handleSubmit() {
    if (!equipmentNeed) return;
    setSubmitting(true);
    setError(null);

    const result = await saveProfile({ fullName, phone, equipmentNeed });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.refresh();
  }
  if (minimized) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="modal-pop w-full max-w-md overflow-hidden rounded-[22px] bg-paper shadow-[0_28px_72px_-16px_rgba(26,26,26,0.32)]">
        <div className="relative">
          <ModalScene title="Merhaba 👋" />
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Şimdilik küçült"
            title="Şimdilik küçült"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/70 text-ink/50 transition hover:bg-white hover:text-ink"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="mb-5 flex items-center gap-2">
            {([1, 2] as const).map((n) => (
              <Fragment key={n}>
                <div
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-all ${
                    step > n
                      ? "bg-ink text-paper"
                      : step === n
                        ? "bg-ink text-paper ring-2 ring-ink/20 ring-offset-1"
                        : "border border-ink/25 text-ink/40"
                  }`}
                >
                  {step > n ? "✓" : n}
                </div>
                {n < 2 && (
                  <div
                    className={`h-px flex-1 rounded-full transition-all ${step > n ? "bg-ink/55" : "bg-ink/12"}`}
                  />
                )}
              </Fragment>
            ))}
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2
                  id="onboarding-title"
                  className="font-heading text-[22px] font-bold tracking-tight text-ink"
                >
                  Senin hakkında
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">
                  Etkinliğe katılmadan önce birkaç bilgiye ihtiyacımız var.
                </p>
              </div>

              <FieldWrap label="Ad ve Soyad">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/50 focus:ring-2 focus:ring-ink/8"
                  placeholder="Ahmet Yılmaz"
                  autoFocus
                />
              </FieldWrap>

              <FieldWrap label="Telefon" hint="Ödül bildirimi için">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/50 focus:ring-2 focus:ring-ink/8"
                  placeholder="05XX XXX XX XX"
                  inputMode="tel"
                />
              </FieldWrap>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canAdvance}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-paper transition hover:bg-ink/85 active:scale-[0.97] active:transition-none disabled:bg-ink/30"
              >
                Devam Et
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2
                  id="onboarding-title"
                  className="font-heading text-[22px] font-bold tracking-tight text-ink"
                >
                  Ekipman ihtiyacın var mı?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">
                  Stanttan teslim alıp etkinlik sonunda iade edebilirsin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {EQUIPMENT_OPTIONS.map((opt) => {
                  const active = equipmentNeed === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEquipmentNeed(opt.value)}
                      aria-pressed={active}
                      className={`flex flex-col gap-2 rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[0.97] active:transition-none ${
                        active
                          ? "border-ink bg-ink/5"
                          : "border-ink/12 bg-white hover:border-ink/30"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex h-8 w-11 items-center">
                          {opt.glyph ? (
                            <VehicleGlyph
                              type={opt.glyph}
                              color="currentColor"
                              accent="var(--color-sun)"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full border-2 border-dashed border-ink/30" />
                          )}
                        </div>
                        <div
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] transition-all ${active ? "bg-ink text-paper" : "border border-ink/25 text-transparent"}`}
                        >
                          ✓
                        </div>
                      </div>
                      <div className="text-[13px] font-semibold text-ink">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-ink/50">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>

              {error && (
                <p className="animate-slide-up rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink/40 disabled:opacity-40"
                >
                  ← Geri
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!equipmentNeed || submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/85 active:scale-[0.97] active:transition-none disabled:bg-ink/30"
                >
                  {submitting ? (
                    <>
                      <Spinner /> Kaydediliyor…
                    </>
                  ) : (
                    "Tamamla"
                  )}
                </button>
              </div>
            </div>
          )}
          <div className="mt-4 border-t border-ink/8 pt-4 text-center">
            <span className="text-[11px] text-ink/40">{email} · </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-[11px] text-ink/50 underline underline-offset-2 transition hover:text-ink/75 disabled:opacity-50"
            >
              {loggingOut ? "Çıkılıyor…" : "Çıkış yap"}
            </button>
          </div>
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

function FieldWrap({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
          {label}
        </span>
        {hint && <span className="text-[10px] text-ink/38">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
