import { useCallback, useEffect, useRef, useState } from "react";
import { Moon } from "lucide-react";
import {
  formatSleepCountdown,
  sleepTimerOptions,
  type SleepSetting,
  type SleepTimerPreset,
} from "../sleepTimer";

export type { SleepSetting } from "../sleepTimer";

interface SleepTimerMenuProps {
  setting: SleepSetting;
  remainingMs: number | null;
  onChange: (next: SleepSetting) => void;
  presets?: SleepTimerPreset[];
  /** The "stop at the end" option. Defaults to end of chapter. */
  endOption?: { label: string; setting: SleepSetting };
  /** `icon` shows only the moon until a countdown is running, to fit an icon rail. */
  variant?: "labeled" | "icon";
}

export function SleepTimerMenu({
  setting,
  remainingMs,
  onChange,
  presets,
  endOption,
  variant = "labeled",
}: SleepTimerMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const armed = setting.kind !== "off";

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const countdown = armed && remainingMs != null ? formatSleepCountdown(remainingMs) : null;
  const label = countdown
    ? variant === "icon"
      ? countdown
      : `Sleep ${countdown}`
    : variant === "icon"
      ? null
      : "Sleep";

  return (
    <div ref={menuRef} className="relative" onBlur={handleBlur}>
      <button
        type="button"
        className={`player-utility-btn flex items-center gap-1.5 ${label ? "px-2" : ""} text-xs`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Sleep timer"
        aria-expanded={open}
        aria-haspopup="menu"
        title={variant === "icon" ? "Sleep timer" : undefined}
        data-active={armed ? "true" : "false"}
      >
        <Moon className={variant === "icon" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} />
        {label && <span className="tabular-nums">{label}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full z-30 mb-2 flex min-w-[160px] flex-col overflow-hidden rounded-lg bg-black/90 py-1.5 shadow-xl backdrop-blur-sm"
        >
          {sleepTimerOptions(armed, presets, endOption).map((option) => (
            <button
              key={option.key}
              role="menuitem"
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-white/85 hover:bg-white/10"
              onClick={() => {
                onChange(option.setting);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
