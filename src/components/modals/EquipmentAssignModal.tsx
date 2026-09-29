"use client";

import { useState } from "react";
import { UserSearch, type SearchedUser } from "@/components/admin/UserSearch";
import { assignEquipment } from "@/lib/actions/activities";

type Props = {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentLabel: string;
  onAssigned?: () => void;
};

export function EquipmentAssignModal({
  open,
  onClose,
  equipmentId,
  equipmentLabel,
  onAssigned,
}: Props) {
  const [user, setUser] = useState<SearchedUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleAssign() {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const result = await assignEquipment({
      equipmentId,
      userId: user.id,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setUser(null);
    onAssigned?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Ekipman Ata · {equipmentLabel}
          </h2>
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
          <UserSearch onSelect={setUser} selected={user} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleAssign}
            disabled={!user || submitting}
            className="w-full rounded-lg bg-sky-deep px-4 py-2.5 font-medium text-paper transition disabled:cursor-not-allowed disabled:bg-ink/20"
          >
            {submitting ? "Atanıyor..." : "Ata"}
          </button>
        </div>
      </div>
    </div>
  );
}
