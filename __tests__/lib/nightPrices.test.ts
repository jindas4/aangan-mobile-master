import {
  nightPrice, weekdayOf, addDays, holidayPicks, periodsError, groupLabel, roomTotal, weekendDaysLabel, periodDates,
} from "@/lib/nightPrices";

const L = { price_inr: 4000, weekend_price_inr: 5000, weekend_days: null,
            price_periods: [{ label: "Diwali", start_date: "2026-11-07", end_date: "2026-11-08", price_inr: 9000 }] };

describe("nightPrices", () => {
  it("numbers weekdays Monday 0 like the server", () => {
    expect(weekdayOf("2026-11-23")).toBe(0);      // a Monday
    expect(weekdayOf("2026-11-29")).toBe(6);      // Sunday
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("prices a night: special > weekend > base", () => {
    expect(nightPrice(L, "2026-11-23")).toMatchObject({ price_inr: 4000, kind: "base" });
    expect(nightPrice(L, "2026-11-27")).toMatchObject({ price_inr: 5000, kind: "weekend" });   // Friday night
    expect(nightPrice(L, "2026-11-07")).toMatchObject({ price_inr: 9000, kind: "special", label: "Diwali" });
    expect(nightPrice({ ...L, weekend_days: [5, 6] }, "2026-11-27").kind).toBe("base");
  });
  it("finds overlapping special prices", () => {
    expect(periodsError(L.price_periods)).toBeNull();
    expect(periodsError([...L.price_periods, { label: "Bhai Dooj", start_date: "2026-11-08", end_date: "2026-11-09", price_inr: 8000 }]))
      .toMatch(/overlap/);
  });
  it("offers the next fixed-date holidays", () => {
    const picks = holidayPicks("2026-12-26");
    expect(picks[0]).toEqual({ label: "New Year", start_date: "2026-12-30", end_date: "2026-12-31" });
    expect(picks.find((p) => p.label === "Christmas")!.start_date).toBe("2027-12-24");
  });
  it("labels and totals", () => {
    expect(groupLabel({ kind: "weekend", rate_inr: 5000, nights: 2, amount_inr: 10000 })).toBe("2 weekend nights");
    expect(groupLabel({ kind: "special", label: "Diwali", rate_inr: 9000, nights: 1, amount_inr: 9000 })).toBe("Diwali · 1 night");
    expect(roomTotal({ room_inr: null, nightly_inr: 3000, nights: 2 })).toBe(6000);
    expect(roomTotal({ room_inr: 13000, nightly_inr: 4333, nights: 3 })).toBe(13000);
    expect(weekendDaysLabel(null)).toBe("Fri & Sat nights");
    expect(periodDates({ start_date: "2026-12-30", end_date: "2027-01-01" })).toMatch(/30 Dec – 1 Jan/);
  });
});
