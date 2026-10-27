import { NextResponse } from 'next/server';

// Live price feeds, proxied from the Signal bot's /api/feeds endpoint (which reads the
// Feed accounts on the Solana program). Used by the docs page's feed viewer.
// If the bot is unreachable we return an empty list with live:false — never sample data.

export const dynamic = 'force-dynamic';

const DEFAULT_SIGNAL_API_URL = 'https://signal-production-d83e.up.railway.app';

export async function GET() {
  const apiUrl = process.env.SIGNAL_API_URL || DEFAULT_SIGNAL_API_URL;

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/feeds`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) {
      return NextResponse.json({ feeds: [], live: false, error: `Signal API returned ${response.status}` });
    }
    const data = await response.json();
    return NextResponse.json({ feeds: Array.isArray(data) ? data : [], live: true });
  } catch {
    return NextResponse.json({ feeds: [], live: false, error: 'Signal API unreachable' });
  }
}
