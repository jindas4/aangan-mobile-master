import { parseSse, replyFromEvents } from "../../lib/chatStream";

const BODY =
  'data: {"type": "session", "session_id": "cs_1"}\n\n' +
  'data: {"type": "text", "content": "Cancellation is free up to 48 hours before check-in.", "tier": "faq"}\n\n' +
  'data: {"type": "done"}\n\n';

describe("parseSse", () => {
  it("parses a whole event stream (React Native fetch, no streaming)", () => {
    const { events, rest } = parseSse(BODY);
    expect(rest).toBe("");
    expect(events.map((e) => e.type)).toEqual(["session", "text", "done"]);
    expect(replyFromEvents(events)).toBe("Cancellation is free up to 48 hours before check-in.");
  });

  it("keeps an incomplete trailing event for the next chunk", () => {
    const { events, rest } = parseSse('data: {"type": "delta", "content": "Hel"}\n\ndata: {"type": "del');
    expect(replyFromEvents(events)).toBe("Hel");
    expect(rest).toBe('data: {"type": "del');
  });

  it("appends deltas and ignores malformed events", () => {
    const { events } = parseSse('data: {"type": "delta", "content": "Hel"}\n\ndata: oops\n\ndata: {"type": "delta", "content": "lo"}\n\n');
    expect(replyFromEvents(events)).toBe("Hello");
  });
});
