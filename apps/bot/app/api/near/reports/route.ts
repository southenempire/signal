import { NextResponse } from 'next/server';
import { NEAR_CONTRACT, NEAR_NETWORK, explorer, nearView } from '@/lib/near';
import { programAttester, readFilings, reportAddress, solscan, SOLANA_PROGRAM } from '@/lib/solana';

// The latest reports filed in the Signal contract on NEAR, and what happened to each accepted price
// on Solana, where it is paid. No wallet addresses are returned, only the Solana report accounts.

export const dynamic = 'force-dynamic';

type Item = { feed: string; price: number; outcome: unknown };
type Report = { id: number; reporter: string; status: string; image_sha256: string; items: Item[] };

const accepted = (o: unknown) => typeof o === 'object' && o !== null && 'Accepted' in o;

export async function GET() {
  try {
    const [count, prompts, feeds, settings] = await Promise.all([
      nearView<number>('reports_count'),
      nearView<string[]>('get_prompts'),
      nearView<number>('feeds_count'),
      nearView<{ attester: string } | null>('get_solana_settings'),
    ]);
    const limit = 20;
    const from = Math.max(0, count - limit);
    const reports = (await nearView<Report[]>('list_reports', { from_index: from, limit })).reverse();

    // Each accepted price's Solana report account (derived, then read in one batch).
    const slots: { r: number; i: number }[] = [];
    reports.forEach((r, ri) => r.items.forEach((it, ii) => { if (r.status === 'Verified' && accepted(it.outcome)) slots.push({ r: ri, i: ii }); }));
    const filings = await readFilings(slots.map(({ r, i }) => reportAddress(reports[r].items[i].feed, reports[r].image_sha256))).catch(() => []);
    const withSolana = reports.map((r) => ({ ...r, items: r.items.map((it) => ({ ...it, solana: null as unknown })) }));
    slots.forEach(({ r, i }, k) => { withSolana[r].items[i].solana = filings[k] ?? null; });

    const attester = await programAttester().catch(() => null);
    return NextResponse.json({
      live: true,
      network: NEAR_NETWORK,
      contract: NEAR_CONTRACT,
      contractUrl: explorer(`address/${NEAR_CONTRACT}`),
      reportsCount: count,
      feedsCount: feeds,
      prompts,
      solana: {
        program: SOLANA_PROGRAM.toBase58(),
        programUrl: solscan(`account/${SOLANA_PROGRAM.toBase58()}`),
        nearKey: settings?.attester ?? null,
        programAttester: attester,
        nearIsAttester: !!settings?.attester && settings.attester === attester,
      },
      reports: withSolana,
    });
  } catch (e) {
    return NextResponse.json({ live: false, contract: NEAR_CONTRACT, error: (e as Error).message.slice(0, 200), reports: [] });
  }
}
