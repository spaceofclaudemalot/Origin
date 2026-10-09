import { describe, it, expect } from "vitest";
import { analysisDelay, createLatestOnly, matchCase } from "./live";
import { createDetectorService } from "./service";

describe("analysisDelay", () => {
  it("waits 500 ms up to 20 000 chars and 1 500 ms beyond", () => {
    expect(analysisDelay(0)).toBe(500);
    expect(analysisDelay(20_000)).toBe(500);
    expect(analysisDelay(20_001)).toBe(1500);
  });
});

describe("createLatestOnly", () => {
  it("flags an earlier run as stale when a later one started", async () => {
    const latest = createLatestOnly<string>();
    let release!: (v: string) => void;
    const slow = latest.run(() => new Promise<string>((r) => (release = r)));
    const fast = await latest.run(async () => "fast");
    release("slow");
    expect(fast).toEqual({ stale: false, value: "fast" });
    expect(await slow).toEqual({ stale: true, value: "slow" });
  });

  it("cancel() makes the pending run stale", async () => {
    const latest = createLatestOnly<number>();
    const pending = latest.run(async () => 1);
    latest.cancel();
    expect((await pending).stale).toBe(true);
  });
});

describe("matchCase", () => {
  it("copies capitalisation of the original", () => {
    expect(matchCase("Delve", "explore")).toBe("Explore");
    expect(matchCase("DELVE", "explore")).toBe("EXPLORE");
    expect(matchCase("delve", "look into")).toBe("look into");
    expect(matchCase("Él", "il")).toBe("Il");
  });

  it("returns empty replacement unchanged", () => {
    expect(matchCase("Delve", "")).toBe("");
  });
});

describe("createDetectorService", () => {
  it("registers the five detectors", () => {
    expect(createDetectorService().getRegisteredIds()).toEqual(["lexical", "connectors", "stereotypes", "rhythm", "paragraphs"]);
  });
});
