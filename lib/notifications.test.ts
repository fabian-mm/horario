import { afterEach, describe, expect, it, vi } from "vitest";
import type { WeeklyQuest } from "./schedule";
import { buildUpcomingActivityReminders, showBrowserNotification } from "./notifications";

const weeklyQuests: WeeklyQuest[] = [
  {
    id: "semester-1",
    title: "Horario general",
    startDate: "2026-08-01",
    active: true,
    dailyMissions: [
      {
        id: "math-class",
        title: "Clase",
        subject: "Matemáticas",
        activityTypeName: "Clase",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "11:00",
        location: "Salón 204",
      },
    ],
  },
];

describe("recordatorios de actividades", () => {
  it("programa el aviso veinte minutos antes y muestra la hora en AM/PM", () => {
    const reminders = buildUpcomingActivityReminders(weeklyQuests, new Date(2026, 7, 10, 8, 0), 0);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].delayMs).toBe(40 * 60 * 1000);
    expect(reminders[0].body).toContain("9:00 AM");
  });

  it("avisa inmediatamente si ya empezó la ventana de aviso, pero no después de comenzar", () => {
    expect(buildUpcomingActivityReminders(weeklyQuests, new Date(2026, 7, 10, 8, 50), 0)[0].delayMs).toBe(0);
    expect(buildUpcomingActivityReminders(weeklyQuests, new Date(2026, 7, 10, 9, 5), 0)).toHaveLength(0);
  });
});

describe("entrega de notificaciones", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("usa el service worker cuando el permiso está concedido", async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const registration = { showNotification } as unknown as ServiceWorkerRegistration;
    const register = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal("window", { isSecureContext: true, Notification: {} });
    vi.stubGlobal("Notification", { permission: "granted" });
    vi.stubGlobal("navigator", { serviceWorker: { register, ready: Promise.resolve(registration) } });

    const result = await showBrowserNotification("Prueba", "Mensaje", { tag: "test" });

    expect(result).toBe("shown");
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(showNotification).toHaveBeenCalledWith("Prueba", expect.objectContaining({ body: "Mensaje", tag: "test" }));
  });
});
