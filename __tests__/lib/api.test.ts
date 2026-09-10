import { ApiError } from "../../lib/api";

describe("ApiError", () => {
  it("stores status and body", () => {
    const err = new ApiError("Not found", 404, { detail: "Resource missing" });
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ detail: "Resource missing" });
  });

  it("is an instance of Error", () => {
    const err = new ApiError("Bad", 400);
    expect(err).toBeInstanceOf(Error);
  });
});
