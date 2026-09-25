"use client";

import { api } from "@/services/api";
import { HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

// Real-time notifications (ADR-0004). One connection per tab, straight to the API (not through the Vercel proxy),
// authenticated by a 2-minute ticket fetched on every (re)connect. Events only say { type, id }: screens reload
// through the normal API. Without NEXT_PUBLIC_REALTIME_URL everything still works, refreshing every 30 s.

export type RealtimeEventType =
  | "appointmentChanged"
  | "prescriptionChanged"
  | "supportRequestChanged"
  | "privacyRequestChanged"
  | "clinicChanged"
  // Synthetic: fired after a reconnect, when events may have been missed.
  | "resync";

export type RealtimeEvent = { type: RealtimeEventType; id?: string };
type Listener = (event: RealtimeEvent) => void;

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL?.replace(/\/$/, "");
const FALLBACK_REFRESH_MS = 30_000;

type RealtimeContextValue = { connected: boolean; subscribe: (listener: Listener) => () => void };
const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!REALTIME_URL) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const emit = (event: RealtimeEvent) => listeners.current.forEach((listener) => listener(event));

    const connection: HubConnection = new HubConnectionBuilder()
      .withUrl(`${REALTIME_URL}/hubs/events`, {
        accessTokenFactory: async () => (await api.getRealtimeTicket()).ticket,
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(LogLevel.None)
      .build();

    connection.on("event", (event: RealtimeEvent) => emit(event));
    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => {
      setConnected(true);
      emit({ type: "resync" });
    });
    // Automatic reconnect gives up after its schedule: keep trying every 30 s while the page is open.
    connection.onclose(() => {
      setConnected(false);
      if (!stopped) retry = setTimeout(start, FALLBACK_REFRESH_MS);
    });

    async function start() {
      try {
        await connection.start();
        setConnected(true);
        emit({ type: "resync" });
      } catch {
        setConnected(false);
        if (!stopped) retry = setTimeout(start, FALLBACK_REFRESH_MS);
      }
    }
    void start();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      if (connection.state !== HubConnectionState.Disconnected) void connection.stop();
    };
  }, []);

  const value = useRef<RealtimeContextValue>({
    connected: false,
    subscribe: (listener) => {
      listeners.current.add(listener);
      return () => listeners.current.delete(listener);
    },
  });
  value.current = { ...value.current, connected };

  return <RealtimeContext.Provider value={value.current}>{children}</RealtimeContext.Provider>;
}

// True while the live connection is up (screens can then poll less).
export function useRealtimeConnected() {
  return useContext(RealtimeContext)?.connected ?? false;
}

// Calls `reload` when one of `types` arrives (optionally only for `id`), after a reconnect, when the tab comes back,
// and every 30 s while there is no live connection.
export function useRealtimeRefresh(types: RealtimeEventType[], reload: () => unknown, id?: string) {
  const context = useContext(RealtimeContext);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const typesKey = types.join(",");

  useEffect(() => {
    if (!context) return;
    const wanted = new Set(typesKey.split(","));
    return context.subscribe((event) => {
      if (event.type === "resync" || (wanted.has(event.type) && (!id || !event.id || event.id === id))) {
        void reloadRef.current();
      }
    });
  }, [context, id, typesKey]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void reloadRef.current();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const live = context?.connected ?? false;
  useEffect(() => {
    if (live) return;
    const timer = setInterval(() => void reloadRef.current(), FALLBACK_REFRESH_MS);
    return () => clearInterval(timer);
  }, [live]);
}
