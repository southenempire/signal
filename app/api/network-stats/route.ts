import { NextResponse } from 'next/server';

// Real network stats, proxied from the Signal bot's /api/stats endpoint.
// SIGNAL_API_URL is the bot's public base URL (e.g. the Railway deployment).
// If the bot is unreachable we report zeros with live:false — never placeholder numbers.
const EMPTY = { activeNodes: 0, totalReports: 0, totalVolume: '0.00', onChainReports: null };

export const dynamic = 'force-dynamic';

const DEFAULT_SIGNAL_API_URL = 'https://signal-production-d83e.up.railway.app';

export async function GET() {
  const apiUrl = process.env.SIGNAL_API_URL || DEFAULT_SIGNAL_API_URL;
  if (!apiUrl) {
    return NextResponse.json({ ...EMPTY, live: false, error: 'SIGNAL_API_URL not set' });
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/stats`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) {
      return NextResponse.json({ ...EMPTY, live: false, error: `Signal API returned ${response.status}` });
    }

    const data = await response.json();
    return NextResponse.json({
      activeNodes: Number(data.activeNodes) || 0,
      totalReports: Number(data.totalReports) || 0,
      totalVolume: Number(data.totalVolume || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      onChainReports: data.onChainReports ?? null,
      live: true,
    });
  } catch {
    return NextResponse.json({ ...EMPTY, live: false, error: 'Signal API unreachable' });
  }
}
