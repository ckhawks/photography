import { formatDistanceToNow, parseISO } from "date-fns";

/**
 * Accepts either a Date or an ISO string. The pg driver returns timestamptz
 * columns as Date objects, where Neon's HTTP driver handed back strings, and
 * server components pass the row value straight through.
 */
export function formatRelativeTimestamp(createdAt: string | Date) {
  const date = createdAt instanceof Date ? createdAt : parseISO(createdAt);
  return formatDistanceToNow(date, { addSuffix: true }); // Example: "3 days ago"
}
