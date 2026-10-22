"use client";

import { useEffect, useState } from "react";

export function EmbedSnippet({ army }: { army: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const code = `<script src="${origin}/embed.js" data-army="${army}" async></script>`;
  return (
    <div className="mt-8">
      <p className="label">Put this army on your community&apos;s site</p>
      <pre className="num mt-2 overflow-x-auto border border-ink bg-[var(--paper-2)] p-3 text-[12px]">{code}</pre>
      <button
        className="btn ghost mt-2"
        onClick={() => navigator.clipboard.writeText(code).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1500)))}
      >
        {copied ? "Copied" : "Copy embed code"}
      </button>
    </div>
  );
}
