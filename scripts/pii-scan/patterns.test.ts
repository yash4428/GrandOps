import { describe, expect, it } from "vitest";
import { redact } from "../../lib/reports/redact";
import { mask, scanText } from "./patterns";

describe("pii scan", () => {
  it("finds phones, aadhaar-like ids and emails", () => {
    expect(scanText("call +91 98765 43210 now").map((h) => h.name)).toEqual(["indian-mobile"]);
    expect(scanText("id 1234 5678 9012").map((h) => h.name)).toEqual(["aadhaar-like"]);
    expect(scanText("mail a.b@gmail.com").map((h) => h.name)).toEqual(["email"]);
  });
  it("ignores timestamps, versions and example addresses", () => {
    expect(scanText('{"time":"2026-10-25T09:30:00.000Z","v":"1.2.3","e":"dev@example.com","ms":1761364800000}')).toEqual([]);
  });
  it("masks matches", () => {
    expect(mask("9876543210")).toBe("98******10");
    expect(mask("abc")).toBe("****");
  });
  it("report redaction strips what the scan would catch", () => {
    const text = redact("ਮੇਰਾ ਨੰਬਰ 9876543210, mail x@gmail.com, id 1234 5678 9012, ref 12345678");
    expect(scanText(text)).toEqual([]);
    expect(text).toContain("[phone]");
  });
});
