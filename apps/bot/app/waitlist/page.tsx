"use client";

import dynamic from "next/dynamic";

const WaitlistContent = dynamic(() => import("./WaitlistContent"), { ssr: false });

export default function WaitlistPage() {
  return <WaitlistContent />;
}
