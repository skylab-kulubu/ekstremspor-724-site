"use client";

import { useEffect, useRef } from "react";

export type RealtimeChannel =
  | "profiles_changes"
  | "equipments_changes"
  | "activities_changes"
  | "event_config_changes";

// Single shared EventSource for the whole tab, multiplexed over all
// realtime channels. Browsers cap HTTP/1.1 origins at ~6 parallel
// connections; if each component opened its own EventSource we'd
// quickly starve mutations and navigations of socket slots.
//
// Each call to subscribeChannel adds a listener; the EventSource is
// torn down once the listener count returns to zero, so a page that
// never mounts a realtime-aware component never opens a connection.

type Listener = () => void;

let es: EventSource | null = null;
const listeners: Record<RealtimeChannel, Set<Listener>> = {
  profiles_changes: new Set(),
  equipments_changes: new Set(),
  activities_changes: new Set(),
  event_config_changes: new Set(),
};
const eventHandlers: Partial<Record<RealtimeChannel, (e: MessageEvent) => void>> =
  {};

function totalListenerCount(): number {
  let n = 0;
  for (const key of Object.keys(listeners) as RealtimeChannel[]) {
    n += listeners[key].size;
  }
  return n;
}

function ensureConnection() {
  if (es) return;
  if (typeof window === "undefined") return;
  es = new EventSource("/api/realtime");
  for (const ch of Object.keys(listeners) as RealtimeChannel[]) {
    const handler = () => {
      for (const l of listeners[ch]) {
        try {
          l();
        } catch {
          /* noop */
        }
      }
    };
    eventHandlers[ch] = handler;
    es.addEventListener(ch, handler as EventListener);
  }
  // No explicit reconnect logic — EventSource auto-retries on its own.
}

function closeIfIdle() {
  if (totalListenerCount() > 0) return;
  if (!es) return;
  for (const ch of Object.keys(eventHandlers) as RealtimeChannel[]) {
    const h = eventHandlers[ch];
    if (h) es.removeEventListener(ch, h as EventListener);
  }
  es.close();
  es = null;
  for (const key of Object.keys(eventHandlers) as RealtimeChannel[]) {
    delete eventHandlers[key];
  }
}

function subscribeChannel(channel: RealtimeChannel, fn: Listener): () => void {
  listeners[channel].add(fn);
  ensureConnection();
  return () => {
    listeners[channel].delete(fn);
    closeIfIdle();
  };
}

/**
 * Subscribe to one or more pg LISTEN/NOTIFY channels. The component's
 * `onChange` fires whenever any of the listed channels notifies. All
 * subscribers across the page share a single EventSource — keep the
 * call site simple, the hook handles refcounting.
 */
export function useRealtime(
  channels: RealtimeChannel | RealtimeChannel[],
  onChange: () => void,
) {
  // Pass the latest callback to listeners without forcing re-subscribe
  // each render.
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  const key = Array.isArray(channels) ? channels.slice().sort().join("|") : channels;

  useEffect(() => {
    const list = Array.isArray(channels) ? channels : [channels];
    const wrapped = () => cbRef.current();
    const unsubs = list.map((c) => subscribeChannel(c, wrapped));
    return () => {
      for (const u of unsubs) u();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
