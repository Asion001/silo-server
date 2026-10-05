import { renderHook, waitFor } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayerSubtitleInfo } from "../types";
import { usePGSSubtitles } from "./usePGSSubtitles";

const instances: Array<{
  options: Record<string, unknown>;
  timeOffset: number;
  dispose: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("libpgs", () => {
  class MockPgsRenderer {
    options: Record<string, unknown>;
    timeOffset: number;
    ready = new Promise<void>(() => {});
    dispose = vi.fn();
    renderAtTimestamp = vi.fn();
    constructor(options: Record<string, unknown>) {
      this.options = options;
      this.timeOffset = (options.timeOffset as number) ?? 0;
      instances.push(this);
    }
  }
  return { PgsRenderer: MockPgsRenderer };
});

const pgsTrack: PlayerSubtitleInfo = {
  index: 3,
  language: "eng",
  codec: "hdmv_pgs_subtitle",
  label: "English",
  source: "embedded",
  url: "/stream/s/subtitles/3.sup?file_id=1",
};

const srtTrack: PlayerSubtitleInfo = {
  index: 4,
  language: "eng",
  codec: "subrip",
  label: "English SRT",
  source: "embedded",
  url: "/stream/s/subtitles/4.vtt?file_id=1",
};

function videoRef(): RefObject<HTMLVideoElement | null> {
  return { current: document.createElement("video") };
}

afterEach(() => {
  instances.length = 0;
});

describe("usePGSSubtitles", () => {
  it("draws the selected PGS track in contain geometry with the stream offset", async () => {
    const onLoadState = vi.fn();
    const { result } = renderHook(() =>
      usePGSSubtitles(videoRef(), [pgsTrack, srtTrack], 3, false, 12, 500, onLoadState),
    );

    expect(result.current.isActive).toBe(true);
    await waitFor(() => expect(instances).toHaveLength(1));
    expect(instances[0]!.options).toMatchObject({
      subUrl: pgsTrack.url,
      aspectRatio: "contain",
      timeOffset: 11.5,
    });
    expect(onLoadState).toHaveBeenLastCalledWith("ready");
  });

  it("stays out of the way for text tracks", () => {
    const { result } = renderHook(() => usePGSSubtitles(videoRef(), [srtTrack], 4, false, 0, 0));

    expect(result.current.isActive).toBe(false);
    expect(instances).toHaveLength(0);
  });

  it("updates the offset in place and disposes when the track turns off", async () => {
    const ref = videoRef();
    const { rerender } = renderHook(
      ({ index, delay }: { index: number | null; delay: number }) =>
        usePGSSubtitles(ref, [pgsTrack], index, false, 0, delay),
      { initialProps: { index: 3 as number | null, delay: 0 } },
    );
    await waitFor(() => expect(instances).toHaveLength(1));

    rerender({ index: 3, delay: 1000 });
    expect(instances[0]!.timeOffset).toBe(-1);
    expect(instances).toHaveLength(1);

    rerender({ index: null, delay: 1000 });
    expect(instances[0]!.dispose).toHaveBeenCalledOnce();
  });
});
