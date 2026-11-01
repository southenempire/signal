import { NextResponse } from 'next/server';
import { NEAR_CONTRACT, NEAR_NETWORK, explorer, nearView } from '@/lib/near';

// The latest reports filed in the Signal contract on NEAR, with the rules they passed.

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [count, prompts, feeds] = await Promise.all([
      nearView<number>('reports_count'),
      nearView<string[]>('get_prompts'),
      nearView<number>('feeds_count'),
    ]);
    const limit = 20;
    const from = Math.max(0, count - limit);
    const reports = (await nearView<unknown[]>('list_reports', { from_index: from, limit })).reverse();
    return NextResponse.json({
      live: true,
      network: NEAR_NETWORK,
      contract: NEAR_CONTRACT,
      contractUrl: explorer(`address/${NEAR_CONTRACT}`),
      reportsCount: count,
      feedsCount: feeds,
      prompts,
      reports,
    });
  } catch (e) {
    return NextResponse.json({ live: false, contract: NEAR_CONTRACT, error: (e as Error).message.slice(0, 200), reports: [] });
  }
}
