import { redirect } from 'next/navigation';

const LAUNCH_DATE = new Date("2026-05-01T00:00:00Z");

export default function RootPage() {
  const now = new Date();
  if (now < LAUNCH_DATE) {
    redirect('/waitlist');
  }
  
  // If we get here, it's live, but for now we just show a placeholder 
  // until we can move the main dashboard content to a client-side-only file too.
  return null;
}
