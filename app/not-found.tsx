import { ArrowLeft, Flower2 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="app-loading">
      <Flower2 size={44} strokeWidth={1.3} />
      <span>A little detour.</span>
      <p>This page wandered off. Your celebrations are waiting at home.</p>
      <a className="button primary" href="/">
        <ArrowLeft size={16} /> Back to Gather
      </a>
    </main>
  );
}
