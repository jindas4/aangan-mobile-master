import { inr, shortDate, fullDate, timeAgo, imageUrl } from "../../lib/format";

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
