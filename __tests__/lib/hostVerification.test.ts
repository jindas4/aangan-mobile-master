import { ApiError } from "../../lib/api";
import { describeMissing, verificationMissing } from "../../lib/hostVerification";

describe("verificationMissing", () => {
  it("returns the missing steps for the publish gate", () => {
    const err = new ApiError("Complete verification first", 403, {
      detail: { reason: "verification_required", missing: ["aadhaar", "payout"] },
    });
    expect(verificationMissing(err)).toEqual(["aadhaar", "payout"]);
  });

  it("ignores other errors", () => {
    expect(verificationMissing(new ApiError("not your listing", 403, { detail: "not your listing" }))).toBeNull();
    expect(verificationMissing(new ApiError("Server error", 500, {}))).toBeNull();
    expect(verificationMissing(new Error("offline"))).toBeNull();
  });
});

describe("describeMissing", () => {
  it("joins steps into a sentence", () => {
    expect(describeMissing(["aadhaar"])).toBe("verify your identity (Aadhaar)");
    expect(describeMissing(["phone", "aadhaar", "payout"])).toBe(
      "verify your phone number, verify your identity (Aadhaar) and add a payout method",
    );
    expect(describeMissing([])).toBe("complete host verification");
  });
});
