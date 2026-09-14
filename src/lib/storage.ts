import { Case } from "./types";

const KEY = "ai-court:cases";
const MAX_CASES = 10;

export function loadCases(): Case[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveCase(c: Case): Case[] {
  const existing = loadCases();
  const next = [c, ...existing].slice(0, MAX_CASES);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or unavailable — fail silently, case still shown this session
  }
  return next;
}

export function nextCaseNumber(): number {
  const existing = loadCases();
  const highest = existing.reduce((max, c) => Math.max(max, c.caseNumber), 0);
  return highest + 1;
}
