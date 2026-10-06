/**
 * Parser for the support chat's server-sent events (`/api/chat/stream`).
 *
 * The backend sends `data: {json}\n\n` events: `session` (session id), `text`
 * (a whole answer), `delta` (a streamed piece) and `done`. React Native's
 * fetch can't stream, so the app usually receives the whole body at once —
 * both cases go through `parseSse`, never straight to the screen.
 */
export type ChatEvent =
  | { type: "session"; session_id: string }
  | { type: "text"; content: string }
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: string; [k: string]: unknown };

/** Parse complete events from `buffer`; returns them plus the unparsed tail. */
export function parseSse(buffer: string): { events: ChatEvent[]; rest: string } {
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: ChatEvent[] = [];
  for (const block of blocks) {
    const data = block
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.replace(/^data:\s?/, ""))
      .join("\n")
      .trim();
    if (!data) continue;
    try {
      events.push(JSON.parse(data));
    } catch {
      /* ignore malformed event */
    }
  }
  return { events, rest };
}

/** Fold events into the assistant's reply text. */
export function replyFromEvents(events: ChatEvent[], current = ""): string {
  let out = current;
  for (const e of events) {
    if (e.type === "text" && typeof e.content === "string") out = e.content;
    else if (e.type === "delta" && typeof e.content === "string") out += e.content;
  }
  return out;
}
