import { db } from "./db";

export type TierCounts = {
  tier0Count: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
};

/**
 * Photo counts per tier, in one statement rather than four round trips.
 * Shared by /about and /api/about so the page does not fetch its own route.
 */
export async function getTierCounts(): Promise<TierCounts> {
  const rows = await db<{ tier: number; count: number }>(
    `SELECT "tier", COUNT(*)::INTEGER AS "count" FROM "Photo" GROUP BY "tier"`
  );

  const byTier = new Map(rows.map((row) => [Number(row.tier), Number(row.count)]));
  return {
    tier0Count: byTier.get(0) ?? 0,
    tier1Count: byTier.get(1) ?? 0,
    tier2Count: byTier.get(2) ?? 0,
    tier3Count: byTier.get(3) ?? 0,
  };
}
