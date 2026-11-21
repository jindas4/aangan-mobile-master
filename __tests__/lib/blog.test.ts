jest.mock("../../lib/api", () => ({ api: jest.fn(), WEB_BASE: "https://www.aanganstay.com" }));

import { parseBlog, parseInline, safeHref, readTime } from "../../lib/blog";

describe("parseBlog", () => {
  it("reads every block the editor can write", () => {
    const md = [
      "## Why go in winter",
      "The valley is quiet",
      "and the orchards are bare.",
      "",
      "### Getting there",
      "- Fly to Bhuntar",
      "- Take the Volvo",
      "1. Pack wool",
      "2. Carry cash",
      "> The bukhari is lit by six.",
      "> [!TIP]",
      "> Book the corner room.",
      "> [!NOTE] Roads close in heavy snow.",
      '![Snow on the deodars](https://img.example/a.jpg "Old Manali in January")',
      "[[stay:lst_abc123]]",
      "---",
    ].join("\n");
    expect(parseBlog(md)).toEqual([
      { t: "h", level: 2, text: "Why go in winter" },
      { t: "p", text: "The valley is quiet and the orchards are bare." },
      { t: "h", level: 3, text: "Getting there" },
      { t: "ul", items: ["Fly to Bhuntar", "Take the Volvo"] },
      { t: "ol", items: ["Pack wool", "Carry cash"] },
      // Consecutive ">" lines are one block; the TIP marker on its first line makes it a callout.
      { t: "quote", text: "The bukhari is lit by six. [!TIP] Book the corner room. [!NOTE] Roads close in heavy snow." },
      { t: "img", alt: "Snow on the deodars", src: "https://img.example/a.jpg", caption: "Old Manali in January" },
      { t: "stay", id: "lst_abc123" },
      { t: "hr" },
    ]);
  });

  it("makes a callout from a > [!TIP] block", () => {
    expect(parseBlog("> [!TIP]\n> Carry cash.")).toEqual([{ t: "callout", kind: "tip", text: "Carry cash." }]);
    expect(parseBlog("> [!note] Roads close.")).toEqual([{ t: "callout", kind: "note", text: "Roads close." }]);
  });

  it("is safe with empty input", () => {
    expect(parseBlog("")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("finds bold, italic and links", () => {
    expect(parseInline("A **warm** *chai* at [Manali](/stays/manali).")).toEqual([
      { t: "text", text: "A " },
      { t: "bold", children: [{ t: "text", text: "warm" }] },
      { t: "text", text: " " },
      { t: "italic", text: "chai" },
      { t: "text", text: " at " },
      { t: "link", label: "Manali", href: "/stays/manali" },
      { t: "text", text: "." },
    ]);
  });

  it("drops links that aren't https, mailto or our own paths", () => {
    expect(parseInline("[x](javascript:alert(1))")[0]).toEqual({ t: "text", text: "x" });
    expect(parseInline("[x](//evil.example)")).toEqual([{ t: "text", text: "x" }]);
    expect(safeHref("https://a.example")).toBe("https://a.example");
    expect(safeHref("ftp://a.example")).toBeNull();
  });
});

it("readTime never says 0 minutes", () => {
  expect(readTime(0)).toBe("1 min read");
  expect(readTime(7)).toBe("7 min read");
});
