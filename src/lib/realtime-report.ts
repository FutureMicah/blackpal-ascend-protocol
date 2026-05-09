// Shared, deterministic timestamped report builder for realtime verification logs
// (rate-refresh + atlas-refresh). Same format used by /a11y-checklist export and
// the RealtimeVerifier in-place download button so reports are comparable across
// sessions.
export type VerifierEntry = {
  at: string; // ISO timestamp
  channel: "rate" | "atlas" | string;
  summary: string;
};

export function buildRealtimeReport(entries: VerifierEntry[]): string {
  const generated = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# BlackPal — Realtime Verification Log`);
  lines.push(`Generated: ${generated}`);
  if (typeof window !== "undefined") lines.push(`URL: ${window.location.href}`);
  if (typeof navigator !== "undefined") lines.push(`User-Agent: ${navigator.userAgent}`);
  lines.push(`Entries: ${entries.length}`);
  lines.push("");
  lines.push("## Events");
  if (entries.length === 0) {
    lines.push("(no events captured)");
  } else {
    entries.forEach((e, i) =>
      lines.push(`${String(i + 1).padStart(3, "0")}. ${e.at} [${e.channel}] ${e.summary}`),
    );
  }
  lines.push("");
  lines.push("## Channel Counts");
  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.channel] = (acc[e.channel] ?? 0) + 1;
    return acc;
  }, {});
  Object.entries(counts).forEach(([c, n]) => lines.push(`- ${c}: ${n}`));
  return lines.join("\n");
}

export function downloadRealtimeReport(entries: VerifierEntry[], prefix = "blackpal-realtime") {
  const blob = new Blob([buildRealtimeReport(entries)], {
    type: "text/markdown;charset=utf-8",
  });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${prefix}-${ts}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
