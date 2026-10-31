"use client";

import { api, clearSession, getSession } from "@/services/api";
import { useEffect } from "react";

// A sessão acompanha o uso: enquanto a pessoa mexe na tela o token é renovado, e ela só termina depois de 10 minutos
// sem uso. Chamada de vídeo e ditado seguram a sessão, porque ali a pessoa usa o sistema sem tocar nele. Polling e
// realtime não contam como uso: quem renova é só este componente.
const IDLE_LIMIT_MS = 10 * 60 * 1000;
const RENEW_EVERY_MS = 2 * 60 * 1000;
const CHECK_EVERY_MS = 15 * 1000;
const WRITE_ACTIVITY_EVERY_MS = 5 * 1000;
// Shared between tabs: working in one tab keeps the others signed in.
const ACTIVITY_KEY = "medsync_last_activity";
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

let holds = 0;
const beforeLogout = new Set<() => Promise<unknown>>();

// Keeps the session alive while something is in use without the mouse or keyboard. Returns the release function.
export function holdSession() {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
  };
}

// Runs right before an idle logout, while the session is still valid, so unsaved work is not lost.
export function onIdleLogout(save: () => Promise<unknown>) {
  beforeLogout.add(save);
  return () => {
    beforeLogout.delete(save);
  };
}

function sharedActivity() {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function SessionKeeper() {
  useEffect(() => {
    let lastActivity = Date.now();
    let lastRenewal = Date.now();
    let leaving = false;

    function markActivity() {
      const now = Date.now();
      if (now - lastActivity < WRITE_ACTIVITY_EVERY_MS) return;
      lastActivity = now;
      try {
        localStorage.setItem(ACTIVITY_KEY, String(now));
      } catch {
        // Private window: this tab still counts its own activity.
      }
    }

    async function endForInactivity() {
      leaving = true;
      await Promise.allSettled([...beforeLogout].map((save) => save()));
      await api.logout().catch(() => undefined);
      clearSession();
      const back = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?motivo=inatividade&voltar=${encodeURIComponent(back)}`;
    }

    function check() {
      if (leaving) return;
      const now = Date.now();
      // Signed out, or on the login page: the clock starts when the session does.
      if (!getSession()) {
        lastActivity = now;
        lastRenewal = now;
        return;
      }

      const latest = Math.max(lastActivity, sharedActivity());
      if (holds === 0 && now - latest >= IDLE_LIMIT_MS) {
        void endForInactivity();
        return;
      }
      if ((holds > 0 || latest > lastRenewal) && now - lastRenewal >= RENEW_EVERY_MS) {
        lastRenewal = now;
        api.refreshSession().catch(() => undefined);
      }
    }

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActivity, { passive: true, capture: true }));
    // A laptop waking up does not wait for the next tick.
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActivity, { capture: true }));
    };
  }, []);

  return null;
}
