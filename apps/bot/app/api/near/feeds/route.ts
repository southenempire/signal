import { NextResponse } from 'next/server';
import { NEAR_CONTRACT, nearView } from '@/lib/near';

// Every price feed in the Signal contract on NEAR: one per item, city and currency, with the
// median of its last accepted prices. Prices are in minor units (cents) of the feed's currency.

export const dynamic = 'force-dynamic';

type Feed = { feed: string; currency: string; median: number | null; samples: number; accepted_total: number; updated_at_secs: number };

export async function GET() {
  try {
    const feeds: Feed[] = [];
    for (let from = 0; ; from += 100) {
      const page = await nearView<Feed[]>('list_feeds', { from_index: from, limit: 100 });
      feeds.push(...page);
      if (page.length < 100) break;
    }
    feeds.sort((a, b) => b.updated_at_secs - a.updated_at_secs);
    return NextResponse.json({ live: true, contract: NEAR_CONTRACT, feeds });
  } catch (e) {
    return NextResponse.json({ live: false, contract: NEAR_CONTRACT, feeds: [], error: (e as Error).message.slice(0, 200) });
  }
}
