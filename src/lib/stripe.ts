interface StripeRevenueRow {
  id: string;
  source: "stripe";
  amount: number;
  currency: string;
  date: string;
  description: string;
}

interface StripeBalanceTransaction {
  id: string;
  amount: number;
  currency: string;
  created: number;
  description: string | null;
  type: string;
}

let cache: { rows: StripeRevenueRow[]; fetchedAt: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function getStripeRevenue(): Promise<StripeRevenueRow[] | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.rows;
  }

  try {
    const res = await fetch("https://api.stripe.com/v1/balance_transactions?limit=20", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return cache?.rows ?? null;

    const data = (await res.json()) as { data: StripeBalanceTransaction[] };
    const rows: StripeRevenueRow[] = data.data
      .filter((tx) => tx.amount > 0)
      .map((tx) => ({
        id: `stripe_${tx.id}`,
        source: "stripe",
        amount: tx.amount / 100,
        currency: tx.currency.toUpperCase(),
        date: new Date(tx.created * 1000).toISOString(),
        description: tx.description ?? tx.type,
      }));

    cache = { rows, fetchedAt: Date.now() };
    return rows;
  } catch {
    return cache?.rows ?? null;
  }
}
