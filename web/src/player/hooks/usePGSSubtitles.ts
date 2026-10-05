import { useEffect, useRef } from "react";
import type { PgsRenderer } from "libpgs";
import pgsWorkerUrl from "libpgs/dist/libpgs.worker.js?url";
import type { PlayerSubtitleInfo } from "../types";
import { isPGSCodec } from "../utils/subtitleCodecs";

const RETRY_DELAY_MS = 5_000;

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Renders an embedded PGS (Blu-ray bitmap) track client-side with libpgs, so
 * selecting one does not force a server-side burn-in transcode.
 *
 * The server serves the track as a complete `.sup` stream; libpgs reads it
 * progressively, so cues appear as the extract reaches them. The canvas always
 * uses contain geometry: in Fill mode the subtitle images stay inside the
 * visible area instead of being cropped with the picture.
 */
export function usePGSSubtitles(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  subtitleUrls: PlayerSubtitleInfo[],
  activeSubtitleIndex: number | null,
  isDetached: boolean,
  streamOriginSeconds: number,
  subtitleDelayMs: number,
  onLoadState?: (state: "idle" | "loading" | "ready" | "error") => void,
  // Bumped when the server retimed the active track behind an unchanged URL.
  cueRevision = 0,
): { isActive: boolean } {
  const onLoadStateRef = useRef(onLoadState);
  onLoadStateRef.current = onLoadState;
  const rendererRef = useRef<PgsRenderer | null>(null);
  // Same convention as the ASS path: an image at source time S shows at video
  // time S - timeOffset, and a positive user delay shows subtitles later.
  const effectiveOffset = streamOriginSeconds - subtitleDelayMs / 1000;
  const offsetRef = useRef(effectiveOffset);
  offsetRef.current = effectiveOffset;

  const activeSub =
    activeSubtitleIndex !== null
      ? (subtitleUrls.find((s) => s.index === activeSubtitleIndex) ?? null)
      : null;
  const isPGS = activeSub !== null && isPGSCodec(activeSub.codec) && activeSub.url.length > 0;
  const activeUrl = isPGS ? activeSub.url : null;

  useEffect(() => {
    const video = videoRef.current as VideoWithFrameCallback | null;
    onLoadStateRef.current?.("idle");
    if (!activeUrl || !video || isDetached) return;

    let cancelled = false;
    let renderer: PgsRenderer | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let frameHandle: number | null = null;

    // libpgs only repaints on timeupdate (about 4 Hz); follow presented frames
    // where the browser exposes them so images appear and clear on time.
    const followFrames = () => {
      if (!video.requestVideoFrameCallback) return;
      frameHandle = video.requestVideoFrameCallback(() => {
        renderer?.renderAtTimestamp(video.currentTime + offsetRef.current);
        followFrames();
      });
    };

    const dispose = () => {
      if (frameHandle !== null) video.cancelVideoFrameCallback?.(frameHandle);
      frameHandle = null;
      renderer?.dispose();
      renderer = null;
      rendererRef.current = null;
    };

    const load = async () => {
      onLoadStateRef.current?.("loading");
      try {
        const { PgsRenderer } = await import("libpgs");
        if (cancelled) return;
        renderer = new PgsRenderer({
          video,
          workerUrl: pgsWorkerUrl,
          aspectRatio: "contain",
          timeOffset: offsetRef.current,
          subUrl: activeUrl,
        });
        rendererRef.current = renderer;
        followFrames();
        // The images stream in as the extract progresses, so the track is
        // usable well before `ready`, which waits for the whole file.
        onLoadStateRef.current?.("ready");
        await renderer.ready;
      } catch (err) {
        if (cancelled) return;
        console.error("[usePGSSubtitles] Unable to load subtitles:", err);
        dispose();
        onLoadStateRef.current?.("error");
        retryTimer = setTimeout(() => void load(), RETRY_DELAY_MS);
      }
    };
    void load();

    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
      dispose();
    };
    // videoRef is a stable ref object; the offset is applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl, isDetached, cueRevision]);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.timeOffset = effectiveOffset;
  }, [effectiveOffset]);

  return { isActive: isPGS && !isDetached };
}
