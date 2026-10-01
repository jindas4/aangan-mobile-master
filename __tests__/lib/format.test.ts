import { inr, shortDate, fullDate, timeAgo, imageUrl, imageVariantUrl, parseDate } from "../../lib/format";

describe("inr", () => {
  it("formats round numbers with Indian grouping", () => {
    expect(inr(1000)).toBe("₹1,000");
    expect(inr(100000)).toBe("₹1,00,000");
  });

  it("handles zero", () => {
    expect(inr(0)).toBe("₹0");
  });
});

describe("shortDate", () => {
  it("returns day + abbreviated month", () => {
    const result = shortDate("2025-03-15T12:00:00Z");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/Mar/);
  });
});

describe("fullDate", () => {
  it("includes year", () => {
    const result = fullDate("2025-12-25T12:00:00Z");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/2025/);
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for recent timestamps", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("just now");
  });

  it("returns minutes for timestamps under an hour", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours for timestamps under a day", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days for timestamps under a week", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });

  it("returns date for timestamps over a week", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
    const result = timeAgo(twoWeeksAgo);
    expect(result).not.toContain("ago");
  });
});

describe("imageUrl", () => {
  it("returns empty string for falsy input", () => {
    expect(imageUrl("")).toBe("");
  });

  it("returns absolute URLs unchanged", () => {
    expect(imageUrl("https://example.com/img.jpg")).toBe("https://example.com/img.jpg");
  });

  it("prepends API base for relative paths", () => {
    const result = imageUrl("/uploads/photo.jpg");
    expect(result).toContain("https://");
    expect(result).toContain("/uploads/photo.jpg");
  });
});

describe("imageVariantUrl", () => {
  const original = "https://cdn.example.com/images/usr_abc123/xYz9.jpg";

  it("derives the sized WebP variant for standard upload keys", () => {
    expect(imageVariantUrl(original, "thumb"))
      .toBe("https://cdn.example.com/images/usr_abc123/thumb/xYz9.webp");
    expect(imageVariantUrl(original, "large"))
      .toBe("https://cdn.example.com/images/usr_abc123/large/xYz9.webp");
  });

  it("passes through URLs that don't match the upload key convention", () => {
    expect(imageVariantUrl("https://elsewhere.com/photo.jpg", "thumb"))
      .toBe("https://elsewhere.com/photo.jpg");
    // Extra path segments = not an original key (could already be a variant).
    expect(imageVariantUrl("https://cdn.example.com/images/usr_a/thumb/x.webp", "large"))
      .toBe("https://cdn.example.com/images/usr_a/thumb/x.webp");
  });

  it("handles empty input", () => {
    expect(imageVariantUrl("", "medium")).toBe("");
  });
});

describe("parseDate", () => {
  // new Date("2026-10-10") is UTC midnight — the 9th anywhere west of UTC.
  it("reads a plain date as that calendar day in the local time zone", () => {
    const d = parseDate("2026-10-10");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 10]);
    expect(fullDate("2026-10-10")).toContain("10");
  });

  it("leaves full timestamps untouched", () => {
    expect(parseDate("2026-09-30T18:30:00Z").toISOString()).toBe("2026-09-30T18:30:00.000Z");
  });
});
