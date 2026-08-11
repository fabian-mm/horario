import type { WeeklyQuest } from "@/lib/schedule";
import { getScheduledOccurrences } from "@/lib/schedule";
import { formatTime12Hour } from "@/lib/time";

export type DailyLoginState = {
  lastLoginDate: string | null;
  streak: number;
  totalBonusXp: number;
  lastAwardedXp: number;
  awardedToday: boolean;
};

export type UpcomingReminder = {
  id: string;
  title: string;
  body: string;
  delayMs: number;
};

export type NotificationDeliveryResult = "shown" | "permission-required" | "unsupported" | "failed";

const DAILY_LOGIN_STORAGE_KEY = "bitacora-daily-login";
const DAILY_LOGIN_XP = 20;
const REMINDER_HORIZON_DAYS = 7;
let workerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStorageKey = (userId: string) => `${DAILY_LOGIN_STORAGE_KEY}:${userId}`;

export const createDefaultDailyLoginState = (): DailyLoginState => ({
  lastLoginDate: null,
  streak: 0,
  totalBonusXp: 0,
  lastAwardedXp: 0,
  awardedToday: false,
});

export const readDailyLoginState = (userId: string | null): DailyLoginState => {
  if (!userId || typeof window === "undefined") return createDefaultDailyLoginState();
  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) return createDefaultDailyLoginState();
  try {
    const parsed = JSON.parse(raw) as Partial<DailyLoginState>;
    return {
      ...createDefaultDailyLoginState(),
      ...parsed,
      lastLoginDate: typeof parsed.lastLoginDate === "string" ? parsed.lastLoginDate : null,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      totalBonusXp: typeof parsed.totalBonusXp === "number" ? parsed.totalBonusXp : 0,
      lastAwardedXp: typeof parsed.lastAwardedXp === "number" ? parsed.lastAwardedXp : 0,
      awardedToday: typeof parsed.awardedToday === "boolean" ? parsed.awardedToday : false,
    };
  } catch {
    return createDefaultDailyLoginState();
  }
};

export const applyDailyLoginReward = (userId: string | null, referenceDate = new Date()) => {
  if (!userId || typeof window === "undefined") return { state: createDefaultDailyLoginState(), awarded: false, xpAwarded: 0 };
  const today = toIsoDate(referenceDate);
  const previous = readDailyLoginState(userId);
  if (previous.lastLoginDate === today) {
    return { state: previous, awarded: false, xpAwarded: 0 };
  }

  const previousDate = previous.lastLoginDate ? new Date(`${previous.lastLoginDate}T12:00:00`) : null;
  const yesterday = new Date(referenceDate);
  yesterday.setDate(referenceDate.getDate() - 1);
  const isConsecutive = Boolean(previousDate && toIsoDate(previousDate) === toIsoDate(yesterday));
  const nextState: DailyLoginState = {
    lastLoginDate: today,
    streak: isConsecutive ? previous.streak + 1 : 1,
    totalBonusXp: previous.totalBonusXp + DAILY_LOGIN_XP,
    lastAwardedXp: DAILY_LOGIN_XP,
    awardedToday: true,
  };
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(nextState));
  return { state: nextState, awarded: true, xpAwarded: DAILY_LOGIN_XP };
};

export const getNotificationPermission = () => {
  if (typeof window === "undefined" || !window.isSecureContext || !("Notification" in window)) return "unsupported" as const;
  return Notification.permission;
};

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !window.isSecureContext || !("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return Notification.requestPermission();
};

export const registerNotificationWorker = async () => {
  if (typeof window === "undefined" || !window.isSecureContext || !("serviceWorker" in navigator)) return null;
  if (!workerRegistrationPromise) {
    workerRegistrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  const registration = await workerRegistrationPromise;
  if (!registration) workerRegistrationPromise = null;
  return registration;
};

export const showBrowserNotification = async (
  title: string,
  body: string,
  options: { tag?: string; url?: string } = {},
): Promise<NotificationDeliveryResult> => {
  if (typeof window === "undefined" || !window.isSecureContext || !("Notification" in window)) return "unsupported";
  if (Notification.permission !== "granted") return "permission-required";

  const notificationOptions = {
    body,
    icon: "/favicon.svg",
    tag: options.tag,
    data: { url: options.url ?? "/" },
  };

  const registration = await registerNotificationWorker();
  if (registration) {
    try {
      await registration.showNotification(title, notificationOptions);
      return "shown";
    } catch {
      // Some desktop browsers still support the window constructor as a fallback.
    }
  }

  try {
    new Notification(title, notificationOptions);
    return "shown";
  } catch {
    return "failed";
  }
};

export const buildUpcomingActivityReminders = (weeklyQuests: WeeklyQuest[], now = new Date(), horizonDays = REMINDER_HORIZON_DAYS): UpcomingReminder[] => {
  const reminders: UpcomingReminder[] = [];
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + offset);
    const occurrences = getScheduledOccurrences(currentDate, weeklyQuests);
    occurrences.forEach((occurrence) => {
      const eventTime = new Date(`${occurrence.date}T${occurrence.startTime}:00`);
      const reminderAt = new Date(eventTime.getTime() - 20 * 60 * 1000);
      const delayMs = Math.max(0, reminderAt.getTime() - now.getTime());
      if (eventTime.getTime() <= now.getTime() || occurrence.completed) return;
      reminders.push({
        id: `${occurrence.occurrenceId}:reminder`,
        title: `Recordatorio: ${occurrence.title}`,
        body: `${occurrence.subject ?? occurrence.activityTypeName ?? "Tu actividad"} empieza a las ${formatTime12Hour(occurrence.startTime)} · ${occurrence.location ?? "sin lugar"}`,
        delayMs,
      });
    });
  }

  return reminders.sort((a, b) => a.delayMs - b.delayMs);
};
