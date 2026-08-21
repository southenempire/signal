'use client';

import React, { useEffect, useState } from 'react';

export default function PitchPage() {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    fetch('/pitch.html')
      .then((res) => res.text())
      .then((data) => setHtmlContent(data))
      .catch((err) => console.error('Failed to load pitch deck HTML:', err));
  }, []);

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#05070a] m-0 p-0">
      <iframe
        srcDoc={htmlContent || undefined}
        src={!htmlContent ? '/pitch.html' : undefined}
        title="Signal Protocol Pitch Deck"
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </main>
  );
}
