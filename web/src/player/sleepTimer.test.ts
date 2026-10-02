import { describe, expect, it } from "vitest";
import { formatSleepCountdown, sleepTimerOptions, videoSleepPresetMinutes } from "./sleepTimer";

describe("formatSleepCountdown", () => {
  it("shows minutes and seconds, and hours once there are any", () => {
    expect(formatSleepCountdown(272_000)).toBe("4:32");
    expect(formatSleepCountdown(0)).toBe("0:00");
    expect(formatSleepCountdown(90 * 60_000)).toBe("1:30:00");
  });
});

describe("videoSleepPresetMinutes", () => {
  it("adds the profile default when the presets lack it", () => {
    expect(videoSleepPresetMinutes(20)).toEqual([15, 20, 30, 45, 60, 90]);
  });

  it("keeps the presets when the default is already one or is off", () => {
    expect(videoSleepPresetMinutes(30)).toEqual([15, 30, 45, 60, 90]);
    expect(videoSleepPresetMinutes(0)).toEqual([15, 30, 45, 60, 90]);
    expect(videoSleepPresetMinutes(undefined)).toEqual([15, 30, 45, 60, 90]);
  });
});

describe("sleepTimerOptions", () => {
  it("offers Turn off only while armed and ends with the end option", () => {
    const end = { label: "End of episode", setting: { kind: "end-of-item" as const } };
    const presets = [{ label: "15 min", seconds: 900 }];
    expect(sleepTimerOptions(false, presets, end).map((o) => o.label)).toEqual([
      "15 min",
      "End of episode",
    ]);
    expect(sleepTimerOptions(true, presets, end).map((o) => o.label)).toEqual([
      "Turn off",
      "15 min",
      "End of episode",
    ]);
  });
});
