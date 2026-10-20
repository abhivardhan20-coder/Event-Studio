"use client";

import { Flower2, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="app-loading" role="alert">
      <Flower2 size={44} strokeWidth={1.3} />
      <span>A little pause.</span>
      <p>Something interrupted your planning. Let’s try that again.</p>
      <button className="button primary" onClick={reset}>
        <RotateCcw size={16} /> Back to the good things
      </button>
    </main>
  );
}
