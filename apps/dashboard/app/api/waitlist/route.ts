import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }

    // Load or initialize waitlist
    let waitlist = [];
    if (fs.existsSync(WAITLIST_FILE)) {
      const content = fs.readFileSync(WAITLIST_FILE, 'utf8');
      waitlist = JSON.parse(content);
    }

    // Check for duplicates
    if (waitlist.some((entry: any) => entry.email === email)) {
      return NextResponse.json({ message: 'Already on the waitlist!' });
    }

    // Add new entry
    waitlist.push({
      email,
      timestamp: new Date().toISOString(),
      notified: false
    });

    // Save back to disk
    fs.writeFileSync(WAITLIST_FILE, JSON.stringify(waitlist, null, 2));

    return NextResponse.json({ message: 'Welcome to the Signal Genesis!' });
  } catch (error) {
    console.error('Waitlist API Error:', error);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}
