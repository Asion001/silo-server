import { useCallback, useMemo, useState } from "react";
import type { PlayerSleepTimer } from "@/player/types";
import { videoSleepPresetMinutes, type SleepSetting } from "@/player/sleepTimer";

export interface VideoSleepTimer {
  /** What the player and its controls receive. */
  player: PlayerSleepTimer;
  /** The current item ended: spends an "end of item" timer, if one is set. */
  consumeEndOfItem: () => void;
}

/**
 * The video sleep timer, owned by the playback host so it survives the player
 * remounting between episodes.
 *
 * A duration timer is a wall-clock deadline the player enforces by pausing.
 * "End of item" is spent when the current item ends. Either one firing blocks
 * autoplay of the next episode for the rest of that playback request; Play Now
 * still works. Stopping playback (`requestKey` becoming null) discards the timer.
 */
export function useVideoSleepTimer(
  requestKey: string | null,
  defaultMinutes: number | undefined,
): VideoSleepTimer {
  const [setting, setSetting] = useState<SleepSetting>({ kind: "off" });
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [firedRequestKey, setFiredRequestKey] = useState<string | null>(null);

  const hasRequest = requestKey != null;
  const [hadRequest, setHadRequest] = useState(hasRequest);
  if (hadRequest !== hasRequest) {
    setHadRequest(hasRequest);
    if (!hasRequest) {
      setSetting({ kind: "off" });
      setDeadlineMs(null);
      setFiredRequestKey(null);
    }
  }

  const presetMinutes = useMemo(() => videoSleepPresetMinutes(defaultMinutes), [defaultMinutes]);
  const onChange = useCallback((next: SleepSetting) => {
    setSetting(next);
    setDeadlineMs(next.kind === "duration" ? Date.now() + next.seconds * 1000 : null);
    setFiredRequestKey(null);
  }, []);
  const onExpire = useCallback(() => {
    setSetting({ kind: "off" });
    setDeadlineMs(null);
    setFiredRequestKey(requestKey);
  }, [requestKey]);
  const consumeEndOfItem = useCallback(() => {
    if (setting.kind !== "end-of-item") return;
    setSetting({ kind: "off" });
    setFiredRequestKey(requestKey);
  }, [requestKey, setting.kind]);

  const blocksAutoPlayNext =
    setting.kind === "end-of-item" || (firedRequestKey !== null && firedRequestKey === requestKey);
  const player = useMemo<PlayerSleepTimer>(
    () => ({ setting, deadlineMs, presetMinutes, onChange, onExpire, blocksAutoPlayNext }),
    [setting, deadlineMs, presetMinutes, onChange, onExpire, blocksAutoPlayNext],
  );
  return { player, consumeEndOfItem };
}
