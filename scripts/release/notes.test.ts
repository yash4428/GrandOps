import { describe, expect, it } from "vitest";
import { notesFor } from "../../lib/release-notes";
import { bumpFor, caregiverNotes, nextVersion, releaseDescription } from "./notes";

describe("release", () => {
  it("bumps semver", () => {
    expect(nextVersion(null, "patch")).toBe("v0.1.0");
    expect(nextVersion("v1.2.3", "patch")).toBe("v1.2.4");
    expect(nextVersion("v1.2.3", "minor")).toBe("v1.3.0");
    expect(nextVersion("1.2.3", "major")).toBe("v2.0.0");
    expect(bumpFor(["type::feature"])).toBe("minor");
    expect(bumpFor(["breaking"])).toBe("major");
    expect(bumpFor([])).toBe("patch");
  });
  it("round-trips caregiver notes into the app's What's new", () => {
    const desc = "Closes #3\n\n## Caregiver notes\n- en: The button is bigger.\n- hi: बटन अब बड़ा है।\n- pa: ਬਟਨ ਹੁਣ ਵੱਡਾ ਹੈ।\n\n## Tests\nall";
    const notes = caregiverNotes(desc);
    expect(notes).toEqual({ en: "The button is bigger.", hi: "बटन अब बड़ा है।", pa: "ਬਟਨ ਹੁਣ ਵੱਡਾ ਹੈ।" });
    const rel = releaseDescription("v0.2.0", { iid: 4, title: "Bigger button" }, notes, 3.1);
    expect(notesFor(rel, "pa")).toBe("- ਬਟਨ ਹੁਣ ਵੱਡਾ ਹੈ।");
    expect(notesFor(rel, "hi")).toContain("बटन");
    expect(notesFor("nothing", "en")).toBeNull();
  });
});
