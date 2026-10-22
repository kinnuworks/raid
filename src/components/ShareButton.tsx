"use client";

/** Opens a prefilled post on X. The army page's share card shows up as the link preview. */
export function ShareButton({ army, text }: { army: string; text: string }) {
  function share() {
    const url = `${window.location.origin}/army/${army}`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  }
  return (
    <button className="btn ghost" onClick={share}>
      Post to X
    </button>
  );
}
