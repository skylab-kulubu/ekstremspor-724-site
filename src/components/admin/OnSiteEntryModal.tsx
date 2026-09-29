"use client";

import { useState } from "react";
import { UserSearch, type SearchedUser } from "@/components/admin/UserSearch";
import { adminOnSiteEntry } from "@/lib/actions/activities";
import type { VehicleType } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

const VEHICLE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: "bicycle", label: "Bisiklet" },
  { value: "skates", label: "Paten" },
  { value: "skateboard", label: "Kaykay" },
  { value: "running", label: "Koşu" },
];

export function OnSiteEntryModal({ open, onClose }: Props) {
  const [user, setUser] = useState<SearchedUser | null>(null);
  const [distance, setDistance] = useState("");
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const distanceNum = Number(distance);
  const canSubmit =
    user &&
    vehicle &&
    distance.length > 0 &&
    !Number.isNaN(distanceNum) &&
    distanceNum > 0;

  async function handleSubmit() {
    if (!user || !vehicle) return;
    setSubmitting(true);
    setError(null);

    const result = await adminOnSiteEntry({
      userId: user.id,
      distance: distanceNum,
      vehicle,
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setUser(null);
    setDistance("");
    setVehicle(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Stant Girişi</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink/50 hover:bg-ink/8"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <span className="mb-1 block text-sm font-medium">Sporcu</span>
            <UserSearch onSelect={setUser} selected={user} />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Mesafe (km)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full rounded-lg border border-ink/20 px-3 py-2 outline-none focus:border-sky"
              placeholder="örn. 4.2"
            />
          </label>
          <div>
            <span className="mb-1 block text-sm font-medium">Araç Türü</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VEHICLE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setVehicle(opt.value)}
                  className={`rounded-xl border-2 p-3 text-sm font-medium transition ${
                    vehicle === opt.value
                      ? "border-sky-deep bg-sky/10"
                      : "border-ink/15 hover:border-sky/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full rounded-lg bg-sky-deep px-4 py-2.5 font-medium text-paper transition disabled:cursor-not-allowed disabled:bg-ink/20"
          >
            {submitting ? "Kaydediliyor..." : "Onaylı Olarak Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
