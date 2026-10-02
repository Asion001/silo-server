/** Sleep timer settings and helpers shared by the audiobook and video players. */
import { useEffect, useState } from "react";

export type SleepSetting =
  | { kind: "off" }
  | { kind: "duration"; seconds: number }
  /** Audiobooks: pause when the current chapter ends. */
  | { kind: "end-of-chapter" }
  /** Video: stop when the current movie or episode ends, without autoplaying the next. */
  | { kind: "end-of-item" };

export interface SleepTimerPreset {
  label: string;
  seconds: number;
}

export interface SleepTimerOption {
  key: string;
  label: string;
  setting: SleepSetting;
}

const DEFAULT_SLEEP_PRESETS: SleepTimerPreset[] = [
  { label: "5 min", seconds: 300 },
  { label: "15 min", seconds: 900 },
  { label: "30 min", seconds: 1800 },
  { label: "45 min", seconds: 2700 },
  { label: "60 min", seconds: 3600 },
];

const DEFAULT_SLEEP_END_OPTION = {
  label: "End of chapter",
  setting: { kind: "end-of-chapter" } as SleepSetting,
};

export function formatSleepCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The menu's entries, in order. Shared by the dropdown and the player's overflow sheet. */
export function sleepTimerOptions(
  armed: boolean,
  presets: SleepTimerPreset[] = DEFAULT_SLEEP_PRESETS,
  endOption: { label: string; setting: SleepSetting } = DEFAULT_SLEEP_END_OPTION,
): SleepTimerOption[] {
  return [
    ...(armed ? [{ key: "off", label: "Turn off", setting: { kind: "off" } as SleepSetting }] : []),
    ...presets.map((p) => ({
      key: `duration-${p.seconds}`,
      label: p.label,
      setting: { kind: "duration", seconds: p.seconds } as SleepSetting,
    })),
    { key: "end", label: endOption.label, setting: endOption.setting },
  ];
}

/**
 * Milliseconds left until a wall-clock deadline, refreshed every second.
 * Ticks locally so only the component showing the countdown re-renders.
 */
export function useSleepRemainingMs(deadlineMs: number | null): number | null {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (deadlineMs == null) return;
    const tick = () => setNowMs(Date.now());
    // The first tick catches up a clock that went stale while no timer ran.
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [deadlineMs]);
  return deadlineMs == null ? null : Math.max(0, deadlineMs - nowMs);
}

const VIDEO_SLEEP_PRESET_MINUTES = [15, 30, 45, 60, 90];

/** The video menu's durations, with the profile's default sleep timer among them. */
export function videoSleepPresetMinutes(defaultMinutes: number | undefined): number[] {
  if (
    !defaultMinutes ||
    defaultMinutes <= 0 ||
    VIDEO_SLEEP_PRESET_MINUTES.includes(defaultMinutes)
  ) {
    return VIDEO_SLEEP_PRESET_MINUTES;
  }
  return [...VIDEO_SLEEP_PRESET_MINUTES, defaultMinutes].sort((a, b) => a - b);
}
