"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalScene, VehicleGlyph } from "@/components/illustrations";
import { KvkkModal } from "@/components/modals/KvkkModal";
import { requestOnSiteEquipment } from "@/lib/actions/activities";
import { compressImage } from "@/lib/utils/compressImage";
import type { EquipmentVehicleType, VehicleType } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
};

type Mode = "on_site" | "remote";

type VehicleOption = {
  value: VehicleType;
  label: string;
};

const VEHICLE_OPTIONS: VehicleOption[] = [
  { value: "bicycle", label: "Bisiklet" },
  { value: "skates", label: "Paten" },
  { value: "skateboard", label: "Kaykay" },
  { value: "running", label: "Koşu" },
];

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: "Bisiklet",
  skates: "Paten",
  skateboard: "Kaykay",
  running: "Koşu",
};
const ON_SITE_VEHICLE_OPTIONS = VEHICLE_OPTIONS.filter(
  (v) => v.value !== "running",
);

export function AddActivityModal({ open, onClose, userId: _userId }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<Mode | null>(null);
  const [distance, setDistance] = useState("");
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [dateRange, setDateRange] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [kvkk, setKvkk] = useState(false);
  const [kvkkOpen, setKvkkOpen] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [banned, setBanned] = useState(false);
  const [activeVehicle, setActiveVehicle] =
    useState<EquipmentVehicleType | null>(null);
  const [existingVehicle, setExistingVehicle] =
    useState<EquipmentVehicleType | null>(null);

  if (!open) return null;

  const distanceNum = Number(distance);
  const canStep2Continue =
    mode === "on_site"
      ? vehicle !== null
      : distance.length > 0 &&
        !Number.isNaN(distanceNum) &&
        distanceNum > 0 &&
        distanceNum < 1000 &&
        vehicle !== null;
  const totalSteps = mode === "on_site" ? 2 : 3;

  function reset() {
    setStep(1);
    setMode(null);
    setDistance("");
    setVehicle(null);
    setDateRange("");
    setEvidence(null);
    setKvkk(false);
    setError(null);
    setDone(false);
    setBanned(false);
    setActiveVehicle(null);
    setExistingVehicle(null);
    setCompressing(false);
  }

  function handleClose() {
    onClose();
    setTimeout(reset, 200);
  }

  async function handleSubmit() {
    if (!vehicle) return;
    setSubmitting(true);
    setError(null);

    if (mode === "remote") {
      if (!evidence || !kvkk) return;

      const form = new FormData();
      form.append("distance", String(distanceNum));
      form.append("vehicle_type", vehicle);
      form.append("kvkk", "1");
      if (dateRange) form.append("date_range", dateRange);
      form.append("evidence", evidence);

      const res = await fetch("/api/activities/remote", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ??
            "Aktivite kaydedilemedi. Lütfen tekrar deneyin.",
        );
        setSubmitting(false);
        return;
      }
    } else {
      if (vehicle === "running") {
        setError(
          "Koşu için stant başvurusu yapılamaz, uzaktan moduyla devam et.",
        );
        setSubmitting(false);
        return;
      }
      const result = await submitOnSiteRequest(vehicle as EquipmentVehicleType);
      setSubmitting(false);
      if (!result) return;
    }

    setSubmitting(false);
    setDone(true);
    router.refresh();
  }
  async function submitOnSiteRequest(
    v: EquipmentVehicleType,
    confirmReplace = false,
  ): Promise<boolean> {
    const res = await requestOnSiteEquipment(v, {
      confirmReplaceExisting: confirmReplace,
    });

    if ("banned" in res) {
      setBanned(true);
      return false;
    }
    if ("activeVehicle" in res) {
      setActiveVehicle(res.activeVehicle);
      return false;
    }
    if ("existingRequest" in res) {
      setExistingVehicle(res.existingRequest.vehicle_type);
      return false;
    }
    if ("error" in res) {
      setError(res.error);
      return false;
    }

    setDone(true);
    router.refresh();
    return true;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-title"
        onClick={handleClose}
      >
        <div
          className="modal-pop w-full max-w-md overflow-hidden rounded-[22px] bg-paper shadow-[0_28px_72px_-16px_rgba(26,26,26,0.32)]"
          onClick={(e) => e.stopPropagation()}
        >
          <ModalScene title="Sürüş Ekle" onClose={handleClose} />

          <div className="px-6 pb-7 pt-5">
            {banned ? (
              <ConflictPanel
                title="Hesabın askıya alındı"
                body="Etkinlik kuralları ihlali nedeniyle yeni başvuru yapamazsın. Detay için stant ekibiyle iletişime geç."
                primaryLabel="Tamam"
                onPrimary={handleClose}
              />
            ) : activeVehicle ? (
              <ConflictPanel
                title="Hâlâ bir ekipmanın var"
                body={`Şu an üzerinde ${VEHICLE_LABEL[activeVehicle] ?? activeVehicle} var. Yeni talep için önce onu stanta iade et.`}
                primaryLabel="Tamam"
                onPrimary={handleClose}
              />
            ) : existingVehicle && vehicle ? (
              <ConflictPanel
                title="Mevcut talebin var"
                body={`${VEHICLE_LABEL[existingVehicle] ?? existingVehicle} için aktif bir talebin var. Yeni talebine geçmek istiyor musun?`}
                primaryLabel={
                  submitting
                    ? "Güncelleniyor…"
                    : `${VEHICLE_LABEL[vehicle] ?? vehicle} ile değiştir`
                }
                secondaryLabel="Eskisi kalsın"
                onPrimary={async () => {
                  setSubmitting(true);
                  setExistingVehicle(null);
                  await submitOnSiteRequest(
                    vehicle as EquipmentVehicleType,
                    true,
                  );
                  setSubmitting(false);
                }}
                onSecondary={handleClose}
                disabled={submitting}
              />
            ) : done ? (
              <div className="flex flex-col gap-4">
                <div>
                  <h2
                    id="activity-title"
                    className="font-heading text-[22px] font-bold tracking-tight text-ink"
                  >
                    {mode === "on_site"
                      ? "Talebın alındı!"
                      : "Aktiviten alındı!"}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink/60">
                    {mode === "on_site"
                      ? "Admin uygun ekipmanı sana atayacak. Ekipmanı teslim ettiğinde admin kilometreni sisteme girecek."
                      : "Admin onayının ardından liderlik tablosunda görünecek. Onay genellikle birkaç saat içinde tamamlanır."}
                  </p>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/5">
                      {vehicle && (
                        <VehicleGlyph
                          type={vehicle}
                          color="currentColor"
                          accent="var(--color-sun)"
                        />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {mode === "on_site"
                          ? `${VEHICLE_OPTIONS.find((v) => v.value === vehicle)?.label ?? ""} talebi`
                          : `${distanceNum} km · ${VEHICLE_OPTIONS.find((v) => v.value === vehicle)?.label ?? ""}`}
                      </div>
                      <div className="text-xs text-ink/50">
                        {mode === "on_site"
                          ? "Ekipman bekleniyor"
                          : "Onay bekliyor"}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex w-full items-center justify-center rounded-full bg-ink py-3 text-sm font-semibold text-paper transition hover:bg-ink/85"
                >
                  Tamam
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-2">
                  {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                    (n) => (
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
                        {n < totalSteps && (
                          <div
                            className={`h-px flex-1 rounded-full transition-all ${
                              step > n ? "bg-ink/55" : "bg-ink/12"
                            }`}
                          />
                        )}
                      </Fragment>
                    ),
                  )}
                </div>
                {step === 1 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2
                        id="activity-title"
                        className="font-heading text-[22px] font-bold tracking-tight text-ink"
                      >
                        Nerede yapıyorsun?
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-ink/60">
                        Aktiviteni nerede gerçekleştirdiğini seç.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("on_site");
                          setError(null);
                        }}
                        aria-pressed={mode === "on_site"}
                        className={`flex flex-col gap-1 rounded-2xl border-2 p-4 text-left transition-all ${
                          mode === "on_site"
                            ? "border-ink bg-ink/5"
                            : "border-ink/12 bg-white hover:border-ink/30"
                        }`}
                      >
                        <div className="text-[13px] font-semibold text-ink">
                          Stanttayım
                        </div>
                        <div className="text-[11px] text-ink/50">
                          Kampüste, ekipmanı stanttan aldım
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode("remote");
                          setError(null);
                        }}
                        aria-pressed={mode === "remote"}
                        className={`flex flex-col gap-1 rounded-2xl border-2 p-4 text-left transition-all ${
                          mode === "remote"
                            ? "border-ink bg-ink/5"
                            : "border-ink/12 bg-white hover:border-ink/30"
                        }`}
                      >
                        <div className="text-[13px] font-semibold text-ink">
                          Uzaktan
                        </div>
                        <div className="text-[11px] text-ink/50">
                          Kendi ekipmanımla, kampüs dışında
                        </div>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={mode === null}
                      className="flex w-full items-center justify-center rounded-full bg-ink py-3 text-sm font-semibold text-paper transition hover:bg-ink/85 disabled:bg-ink/30"
                    >
                      Devam Et
                    </button>
                  </div>
                )}
                {step === 2 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2
                        id="activity-title"
                        className="font-heading text-[22px] font-bold tracking-tight text-ink"
                      >
                        {mode === "on_site"
                          ? "Hangi ekipmanla?"
                          : "Sürüş detayları"}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-ink/60">
                        {mode === "on_site"
                          ? "Kullanmak istediğin araç türünü seç. Admin ekipman atadıktan sonra sürüşe başlayabilirsin."
                          : "Mesafen ve araç türünü gir."}
                      </p>
                    </div>

                    {mode === "remote" && (
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                          Mesafe (km)
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.1"
                          value={distance}
                          onChange={(e) => setDistance(e.target.value)}
                          className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/50"
                          placeholder="örn. 12.5"
                          autoFocus
                        />
                      </label>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                        Araç Türü
                      </span>
                      <div
                        className={`grid gap-2 ${
                          mode === "on_site"
                            ? "grid-cols-3"
                            : "grid-cols-2 sm:grid-cols-4"
                        }`}
                      >
                        {(mode === "on_site"
                          ? ON_SITE_VEHICLE_OPTIONS
                          : VEHICLE_OPTIONS
                        ).map((opt) => {
                          const active = vehicle === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setVehicle(opt.value)}
                              aria-pressed={active}
                              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all ${
                                active
                                  ? "border-ink bg-ink/5"
                                  : "border-ink/12 bg-white hover:border-ink/30"
                              }`}
                            >
                              <div className="flex h-8 w-10 items-center justify-center">
                                <VehicleGlyph
                                  type={opt.value}
                                  color="currentColor"
                                  accent="var(--color-sun)"
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-ink">
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {mode === "remote" && (
                      <label className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                            Tarih / Saat
                          </span>
                          <span className="text-[10px] text-ink/38">
                            Opsiyonel
                          </span>
                        </div>
                        <input
                          type="text"
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value)}
                          className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink/50"
                          placeholder="örn. 14 Mayıs sabah"
                        />
                      </label>
                    )}

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink/40"
                      >
                        ← Geri
                      </button>
                      {mode === "on_site" ? (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={!canStep2Continue || submitting}
                          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/85 disabled:bg-ink/30"
                        >
                          {submitting ? "Gönderiliyor…" : "Talep Gönder"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          disabled={!canStep2Continue}
                          className="flex flex-1 items-center justify-center rounded-full bg-ink py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/85 disabled:bg-ink/30"
                        >
                          Devam Et
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2
                        id="activity-title"
                        className="font-heading text-[22px] font-bold tracking-tight text-ink"
                      >
                        Kanıt yükle
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-ink/60">
                        Strava, Apple Sağlık veya benzeri bir uygulamadan ekran
                        görüntüsü yükle.
                      </p>
                    </div>

                    <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ink/18 bg-white p-5 text-center transition hover:border-ink/35">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCompressing(true);
                          setEvidence(await compressImage(file));
                          setCompressing(false);
                        }}
                      />
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 32 32"
                        fill="none"
                        aria-hidden="true"
                      >
                        <rect
                          x="4"
                          y="4"
                          width="24"
                          height="24"
                          rx="6"
                          fill="currentColor"
                          className="text-ink/8"
                        />
                        <path
                          d="M16 20V12M16 12L13 15M16 12L19 15"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-ink/50"
                        />
                        <path
                          d="M11 22h10"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          className="text-ink/30"
                        />
                      </svg>
                      {compressing ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-semibold text-ink/60">
                            Sıkıştırılıyor…
                          </span>
                        </div>
                      ) : evidence ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-semibold text-ink">
                            {evidence.name}
                          </span>
                          <span className="text-[11px] text-ink/40">
                            Değiştirmek için tıkla
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-semibold text-ink">
                            Görsel seç
                          </span>
                          <span className="text-[11px] text-ink/40">
                            PNG, JPG veya HEIC
                          </span>
                        </div>
                      )}
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3">
                      <div className="relative mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={kvkk}
                          onChange={(e) => setKvkk(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div
                          className={`grid h-5 w-5 place-items-center rounded-md border-2 transition-all ${
                            kvkk
                              ? "border-ink bg-ink"
                              : "border-ink/25 bg-white"
                          }`}
                        >
                          {kvkk && (
                            <svg
                              width="10"
                              height="8"
                              viewBox="0 0 10 8"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="white"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-[12px] leading-relaxed text-ink/65">
                        Yüklediğim görselin etkinlik kapsamında doğrulama
                        amacıyla işlenmesini kabul ediyorum{" "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setKvkkOpen(true);
                          }}
                          className="font-medium text-ink/80 underline underline-offset-2 transition hover:text-ink"
                        >
                          (KVKK)
                        </button>
                        .
                      </span>
                    </label>

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink/40"
                      >
                        ← Geri
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!evidence || !kvkk || submitting || compressing}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/85 disabled:bg-ink/30"
                      >
                        {submitting ? "Gönderiliyor…" : "Onaya Gönder"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <KvkkModal open={kvkkOpen} onClose={() => setKvkkOpen(false)} />
    </>
  );
}

function ConflictPanel({
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  disabled,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  secondaryLabel?: string;
  onSecondary?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-[22px] font-bold tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink/60">{body}</p>
      </div>
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            disabled={disabled}
            className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-ink/40 disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onPrimary}
          disabled={disabled}
          className="flex flex-1 items-center justify-center rounded-full bg-ink py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/85 disabled:bg-ink/30"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
