"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthModal } from "@/components/modals/AuthModal";
import { MyActivitiesModal } from "@/components/modals/MyActivitiesModal";
import { Arrow } from "@/components/illustrations";
import { KosturanziLogo } from "@/components/ui/KosturanziLogo";

type Props = {
  isAuthed: boolean;
  isAdmin: boolean;
  needsOnboarding?: boolean;
  isBanned?: boolean;
  userId?: string;
};

const NAV_LINKS = [
  { href: "#leaderboard", label: "Liderlik" },
  { href: "#equipment", label: "Ekipman" },
  { href: "#how", label: "Nasıl Katılırım" },
];

export function Header({
  isAuthed,
  isAdmin,
  needsOnboarding,
  isBanned,
  userId,
}: Props) {
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <header className="fixed top-3 z-30 flex w-full justify-center px-3 sm:top-4 sm:px-4">
        <div className="pointer-events-auto flex w-full max-w-2xl flex-col items-center">
          <nav className="flex w-full items-center gap-1 rounded-full border border-white/70 bg-white/80 py-1.5 pl-3 pr-1.5 shadow-[0_12px_32px_-8px_rgba(26,26,26,0.2)] backdrop-blur-md backdrop-saturate-150 sm:w-auto sm:pl-4">
            <Link
              href="/"
              className="mr-auto flex items-center pr-2 sm:mr-2 sm:pr-3"
            >
              <KosturanziLogo size="sm" />
            </Link>

            <div className="hidden items-center gap-0.5 border-l border-ink/10 pl-1.5 md:flex">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3 py-1.5 text-[13px] font-medium text-ink/80 transition hover:bg-ink/5"
                >
                  {l.label}
                </a>
              ))}
            </div>

            {isAuthed ? (
              <div className="ml-1 flex items-center gap-1">
                {needsOnboarding ? (
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent("open-onboarding"))
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-paper px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-ink/5 active:scale-[0.97] active:transition-none sm:px-4"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-sun" />
                    Profilini Tamamla
                  </button>
                ) : isAdmin ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 rounded-full bg-sky-deep px-3.5 py-2 text-[13px] font-semibold text-paper transition hover:bg-sky-deep/85 active:scale-[0.97] active:transition-none sm:px-4"
                  >
                    Admin <Arrow size={11} color="currentColor" />
                  </Link>
                ) : !isBanned ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("open-add-activity"),
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper transition hover:bg-ink/90 active:scale-[0.97] active:transition-none sm:px-4"
                  >
                    Aktivite Ekle <Arrow size={11} color="currentColor" />
                  </button>
                ) : null}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    aria-label="Hesap menüsü"
                    aria-expanded={userMenuOpen}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/65 transition hover:bg-ink/8"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="animate-slide-down absolute right-0 top-full z-20 mt-1.5 min-w-45 overflow-hidden rounded-[14px] border border-ink/10 bg-white py-1 shadow-[0_12px_32px_-8px_rgba(26,26,26,0.2)]">
                        {userId && !needsOnboarding && (
                          <button
                            type="button"
                            onClick={() => {
                              setActivitiesOpen(true);
                              setUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-ink/80 transition hover:bg-ink/5"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 5h13M3 12h13M3 19h9" />
                              <circle cx="19" cy="5" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                            Aktivitelerim
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Çıkış Yap
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper transition hover:bg-ink/90 active:scale-[0.97] active:transition-none sm:px-4"
              >
                Giriş Yap <Arrow size={11} color="currentColor" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menü"
              aria-expanded={menuOpen}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/75 transition hover:bg-ink/5 md:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <>
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="6" y1="18" x2="18" y2="6" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </nav>

          {menuOpen && (
            <div className="animate-slide-down mt-2 w-full rounded-[20px] border border-white/70 bg-white/90 p-2 shadow-[0_12px_32px_-8px_rgba(26,26,26,0.2)] backdrop-blur-md backdrop-saturate-150 md:hidden">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-ink/5"
                >
                  {l.label}
                </a>
              ))}
              {isAuthed && (
                <>
                  <div className="mx-2 my-1.5 h-px bg-ink/8" />
                  {userId && !needsOnboarding && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivitiesOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-ink/5"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 5h13M3 12h13M3 19h9" />
                        <circle cx="19" cy="5" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                      Aktivitelerim
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Çıkış Yap
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {userId && (
        <MyActivitiesModal
          userId={userId}
          open={activitiesOpen}
          onClose={() => setActivitiesOpen(false)}
        />
      )}
    </>
  );
}
