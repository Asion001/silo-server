// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVideoSleepTimer } from "./useVideoSleepTimer";

function setup(requestKey: string | null = "req-1", defaultMinutes?: number) {
  return renderHook(({ key, minutes }) => useVideoSleepTimer(key, minutes), {
    initialProps: { key: requestKey, minutes: defaultMinutes },
  });
}

describe("useVideoSleepTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T23:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets a wall-clock deadline for a duration", () => {
    const { result } = setup();
    act(() => result.current.player.onChange({ kind: "duration", seconds: 900 }));
    expect(result.current.player.deadlineMs).toBe(Date.now() + 900_000);
    expect(result.current.player.blocksAutoPlayNext).toBe(false);
  });

  it("keeps a running duration across episodes and blocks autoplay only after it fires", () => {
    const { result, rerender } = setup();
    act(() => result.current.player.onChange({ kind: "duration", seconds: 3600 }));
    const deadline = result.current.player.deadlineMs;

    rerender({ key: "req-2", minutes: undefined });
    expect(result.current.player.deadlineMs).toBe(deadline);
    expect(result.current.player.blocksAutoPlayNext).toBe(false);

    act(() => result.current.player.onExpire());
    expect(result.current.player.setting).toEqual({ kind: "off" });
    expect(result.current.player.blocksAutoPlayNext).toBe(true);

    // A new request the viewer starts is not held back by the old timer.
    rerender({ key: "req-3", minutes: undefined });
    expect(result.current.player.blocksAutoPlayNext).toBe(false);
  });

  it("blocks autoplay while end of item is set and after it is spent", () => {
    const { result } = setup();
    act(() => result.current.player.onChange({ kind: "end-of-item" }));
    expect(result.current.player.blocksAutoPlayNext).toBe(true);

    act(() => result.current.consumeEndOfItem());
    expect(result.current.player.setting).toEqual({ kind: "off" });
    expect(result.current.player.blocksAutoPlayNext).toBe(true);
  });

  it("leaves a duration timer alone when the item ends", () => {
    const { result } = setup();
    act(() => result.current.player.onChange({ kind: "duration", seconds: 900 }));
    act(() => result.current.consumeEndOfItem());
    expect(result.current.player.setting).toEqual({ kind: "duration", seconds: 900 });
  });

  it("discards the timer when playback stops", () => {
    const { result, rerender } = setup();
    act(() => result.current.player.onChange({ kind: "duration", seconds: 900 }));
    rerender({ key: null, minutes: undefined });
    expect(result.current.player.setting).toEqual({ kind: "off" });
    expect(result.current.player.deadlineMs).toBeNull();
  });

  it("offers the profile's default duration", () => {
    const { result } = setup("req-1", 20);
    expect(result.current.player.presetMinutes).toContain(20);
  });
});
