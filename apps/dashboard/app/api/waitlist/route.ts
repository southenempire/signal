import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    // Lazy initialize to prevent build-time crashes when env keys are missing
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    console.log(`[Waitlist] New entry: ${email}`);

    // --- DIRECT CODE NOTIFICATION via Resend ---
    if (resend) {
      await resend.emails.send({
        from: 'Signal <genesis@signal-depin.io>',
        to: email,
        subject: '🛰️ Welcome to Signal Protocol Genesis',
        html: `
          <div style="font-family: sans-serif; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 20px;">
            <p style="color: #10B981; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 10px;">Security Alert: Ground Truth Signal</p>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; font-style: italic;">THE PROTOCOL IS PRIMING.</h1>
            <p style="color: #a1a1aa; line-height: 1.6; font-size: 14px;">
              You have successfully joined the <strong>Signal Protocol Genesis</strong> waitlist. 
              Our 11-day countdown is active, and once it concludes, you will be among the first 
              to access the sovereign mission control console.
            </p>
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 12px; border: 1px solid #333; margin: 20px 0;">
              <p style="margin: 0; color: #ffffff; font-size: 12px; font-weight: bold;">NODE STATUS: PENDING</p>
              <p style="margin: 5px 0 0 0; color: #10B981; font-size: 12px;">Launch Sequence: T-Minus 11 Days</p>
            </div>
            <p style="color: #52525b; font-size: 11px;">
              This is an autonomous notification from the Signal Genesis Engine. 
              Do not reply—the Oracle is monitoring the chain.
            </p>
          </div>
        `
      });
    }
 else {
      console.warn('RESEND_API_KEY not found. Falling back to local logging only.');
    }

    return NextResponse.json({ message: 'Welcome to the Signal Genesis!' });
  } catch (error) {
    console.error('Waitlist API Error:', error);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}
