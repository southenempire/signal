import { NextResponse } from 'next/server';

// Simple in-memory store (persists per cold-start, but logs are permanent)
const waitlistLog: string[] = [];

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // PERMANENT LOG — always visible in Vercel Function Logs
    console.log(`[WAITLIST_SIGNUP] ${new Date().toISOString()} | ${email}`);
    waitlistLog.push(email);

    // Optional: Send welcome email via Resend (free tier)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendKey);
        
        // Notify YOU about the new signup
        await resend.emails.send({
          from: 'Signal <onboarding@resend.dev>',
          to: process.env.ADMIN_EMAIL || 'alabanaomi2020@icloud.com',
          subject: `🛰️ New Waitlist Signup: ${email}`,
          html: `
            <div style="font-family: monospace; background: #050505; color: #fff; padding: 30px; border-radius: 16px;">
              <p style="color: #10B981; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">Signal Genesis — New Signup</p>
              <h2 style="margin: 10px 0;">${email}</h2>
              <p style="color: #666; font-size: 12px;">${new Date().toISOString()}</p>
              <p style="color: #666; font-size: 12px;">Total signups this session: ${waitlistLog.length}</p>
            </div>
          `
        });

        // Send welcome email to the user
        await resend.emails.send({
          from: 'Signal <onboarding@resend.dev>',
          to: email,
          subject: '🛰️ Welcome to Signal Protocol Genesis',
          html: `
            <div style="font-family: sans-serif; background: #050505; color: #fff; padding: 40px; border-radius: 20px;">
              <p style="color: #10B981; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 10px;">Signal Protocol Genesis</p>
              <h1 style="font-size: 24px; font-weight: 900; font-style: italic;">YOU'RE IN. THE ORACLE AWAITS.</h1>
              <p style="color: #a1a1aa; line-height: 1.8; font-size: 14px;">
                You've joined the <strong>Signal Protocol Genesis</strong> waitlist.
                When the countdown hits zero, you'll be among the first to report 
                real-world data and earn USDC on Solana.
              </p>
              <div style="background: #111; padding: 20px; border-radius: 12px; border: 1px solid #222; margin: 20px 0;">
                <p style="margin: 0; color: #10B981; font-size: 13px; font-weight: bold;">✅ STATUS: CONFIRMED</p>
                <p style="margin: 5px 0 0; color: #666; font-size: 11px;">Launch in 7 days · Telegram Bot · Vision AI · Solana USDC</p>
              </div>
              <p style="color: #444; font-size: 10px;">Signal DePIN © 2026 · Autonomous Genesis Engine</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('[WAITLIST] Email send failed:', emailErr);
        // Don't fail the signup if email fails
      }
    } else {
      console.warn('[WAITLIST] No RESEND_API_KEY — email not sent, but signup logged.');
    }

    return NextResponse.json({ message: 'Welcome to Signal Genesis!' });
  } catch (error) {
    console.error('[WAITLIST] Error:', error);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}

// GET endpoint — check signups count (admin only)
export async function GET() {
  return NextResponse.json({ 
    count: waitlistLog.length,
    note: "Check Vercel Function Logs for full email list (search: WAITLIST_SIGNUP)" 
  });
}
