import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

export function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sum(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0);
}

export function roundTo(value: number, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function formatClockTime(isoLocalTimestamp: string) {
  const timePart = isoLocalTimestamp.split("T")[1] ?? "00:00";
  const [hourText, minuteText] = timePart.split(":");
  const hour = Number(hourText);
  const minute = minuteText?.slice(0, 2) ?? "00";

  if (Number.isNaN(hour)) {
    return "--:--";
  }

  const meridiem = hour >= 12 ? "PM" : "AM";
  const twelveHour = ((hour + 11) % 12) + 1;
  return `${twelveHour}:${minute} ${meridiem}`;
}

export function formatDayName(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(utcDate);
}

export function getDateInTimezone(
  date: Date,
  timezone: string = "America/Los_Angeles",
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dateKeyFromDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return dateKeyFromDate(utcDate);
}

export function safeNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return value;
}
