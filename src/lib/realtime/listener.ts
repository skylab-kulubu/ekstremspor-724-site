import { Client } from "pg";

// Channels we publish change events on (must match init.sql trigger names).
export const REALTIME_CHANNELS = [
  "profiles_changes",
  "equipments_changes",
  "activities_changes",
  "event_config_changes",
] as const;

export type RealtimeChannel = (typeof REALTIME_CHANNELS)[number];

export function isRealtimeChannel(name: string): name is RealtimeChannel {
  return (REALTIME_CHANNELS as readonly string[]).includes(name);
}

type Listener = (payload: string) => void;
type Subscribers = Map<RealtimeChannel, Set<Listener>>;

type Broker = {
  client: Client | null;
  starting: Promise<void> | null;
  subscribers: Subscribers;
};

declare global {
  // eslint-disable-next-line no-var
  var __realtimeBroker: Broker | undefined;
}

function getBroker(): Broker {
  if (!global.__realtimeBroker) {
    global.__realtimeBroker = {
      client: null,
      starting: null,
      subscribers: new Map(),
    };
  }
  return global.__realtimeBroker;
}

async function ensureClient(broker: Broker): Promise<void> {
  if (broker.client) return;
  if (broker.starting) return broker.starting;

  broker.starting = (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const client = new Client({ connectionString: url });

    client.on("notification", (msg) => {
      if (!msg.channel || !isRealtimeChannel(msg.channel)) return;
      const set = broker.subscribers.get(msg.channel);
      if (!set) return;
      const payload = msg.payload ?? "{}";
      for (const l of set) {
        try {
          l(payload);
        } catch {
          // ignore listener errors
        }
      }
    });

    client.on("error", () => {
      // Force a reconnect on next subscribe.
      broker.client = null;
      broker.starting = null;
      try {
        client.end().catch(() => {});
      } catch {
        /* noop */
      }
    });

    await client.connect();
    for (const ch of REALTIME_CHANNELS) {
      await client.query(`LISTEN ${ch}`);
    }
    broker.client = client;
  })();

  try {
    await broker.starting;
  } finally {
    broker.starting = null;
  }
}

export async function subscribe(
  channel: RealtimeChannel,
  listener: Listener,
): Promise<() => void> {
  const broker = getBroker();
  await ensureClient(broker);
  let set = broker.subscribers.get(channel);
  if (!set) {
    set = new Set();
    broker.subscribers.set(channel, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
  };
}
