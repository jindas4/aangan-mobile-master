import { groupPhotos, roomLabel, roomOptions, roomValue, splitRoom } from "@/lib/photoCategories";

describe("photo rooms", () => {
  it("splits and joins numbered rooms like the API", () => {
    expect(splitRoom("bedroom:2")).toEqual({ code: "bedroom", room_no: 2 });
    expect(splitRoom("kitchen:2")).toEqual({ code: "kitchen", room_no: null });
    expect(splitRoom("garage")).toEqual({ code: null, room_no: null });
    expect(roomValue({ category: "bathroom", room_no: 1 })).toBe("bathroom:1");
    expect(roomValue({ category: "view", room_no: 3 })).toBe("view");
  });

  it("numbers bedrooms and bathrooms only when there are several", () => {
    const labels = roomOptions(3, 1, 2).map((o) => o.label);
    expect(labels).toContain("Bedroom 2 (master)");
    expect(labels).toContain("Bathroom");
    expect(labels).not.toContain("Bedroom");
    expect(roomOptions(1, 1).some((o) => o.value === "bedroom")).toBe(true);
  });

  it("names the master and tours it first among bedrooms", () => {
    const imgs = [
      { id: 1, category: "bedroom", room_no: 1 },
      { id: 2, category: "exterior", room_no: null },
      { id: 3, category: null, room_no: null },
      { id: 4, category: "bedroom", room_no: 3 },
      { id: 5, category: "bathroom", room_no: 1 },
      { id: 6, category: "bedroom", room_no: null },
    ];
    const groups = groupPhotos(imgs, 3);
    expect(groups.map((g) => (g.code ? roomLabel(g.images[0], 3) : "More"))).toEqual(
      ["Outside", "Master bedroom", "Bedroom 1", "Bedroom", "Bathroom 1", "More"]);
  });
});
