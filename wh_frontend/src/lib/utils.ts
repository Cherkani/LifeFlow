import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function startOfIsoWeek(date: Date) {
  const output = new Date(date);
  const day = output.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  output.setDate(output.getDate() + diff);
  output.setHours(0, 0, 0, 0);
  return output;
}

export function endOfIsoWeek(date: Date) {
  const output = startOfIsoWeek(date);
  output.setDate(output.getDate() + 6);
  output.setHours(23, 59, 59, 999);
  return output;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatMoneyDhs(amount: number) {
  const formatted = new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  return `${formatted} Dhs`;
}

export function displayCurrencyLabel(_currencyCode?: string) {
  return "Dhs";
}
