import { formatDistanceToNow, parseISO } from "date-fns";

// Helper function for formatting timestamps
export function formatRelativeTimestamp(createdAt: string) {
  const date = parseISO(createdAt);
  return formatDistanceToNow(date, { addSuffix: true }); // Example: "3 days ago"
}
