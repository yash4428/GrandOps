import { afterEach, describe, expect, it } from "vitest";
import { secretEnv } from "../../lib/env/secret";

describe("secretEnv", () => {
  afterEach(() => delete process.env.TEST_SECRET);
  it("treats missing, empty and placeholder values as unset", () => {
    expect(secretEnv("TEST_SECRET")).toBeUndefined();
    process.env.TEST_SECRET = " ";
    expect(secretEnv("TEST_SECRET")).toBeUndefined();
    process.env.TEST_SECRET = "unset";
    expect(secretEnv("TEST_SECRET")).toBeUndefined();
  });
  it("returns a real value", () => {
    process.env.TEST_SECRET = "abc";
    expect(secretEnv("TEST_SECRET")).toBe("abc");
  });
});
