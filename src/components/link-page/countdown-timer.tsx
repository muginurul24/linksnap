"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type CountdownState = {
  days: number;
  hours: number;
  isExpired: boolean;
  isUrgent: boolean;
  minutes: number;
  seconds: number;
  totalSeconds: number;
};

type CountdownTimerProps = {
  className?: string;
  targetDate: Date;
};

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;

export function getCountdownState(
  targetDate: Date,
  now = new Date(),
): CountdownState {
  const totalSeconds = Math.max(
    0,
    Math.floor((targetDate.getTime() - now.getTime()) / 1000),
  );

  const days = Math.floor(totalSeconds / SECONDS_PER_DAY);
  const afterDays = totalSeconds % SECONDS_PER_DAY;
  const hours = Math.floor(afterDays / SECONDS_PER_HOUR);
  const afterHours = afterDays % SECONDS_PER_HOUR;
  const minutes = Math.floor(afterHours / SECONDS_PER_MINUTE);
  const seconds = afterHours % SECONDS_PER_MINUTE;

  return {
    days,
    hours,
    isExpired: totalSeconds === 0,
    isUrgent: totalSeconds > 0 && totalSeconds < SECONDS_PER_HOUR,
    minutes,
    seconds,
    totalSeconds,
  };
}

export function formatCountdownValue(state: CountdownState): string {
  return [state.days, state.hours, state.minutes, state.seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function CountdownTimer({ className, targetDate }: CountdownTimerProps) {
  const [state, setState] = useState(() => getCountdownState(targetDate));

  useEffect(() => {
    const tick = () => setState(getCountdownState(targetDate));

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, [targetDate]);

  if (state.isExpired) {
    return (
      <span className={cn("font-medium text-destructive", className)}>
        Offer expired
      </span>
    );
  }

  return (
    <span
      aria-live="polite"
      className={cn(
        "font-mono font-semibold tabular-nums tracking-normal",
        state.isUrgent && "animate-pulse text-destructive",
        className,
      )}
    >
      {formatCountdownValue(state)}
    </span>
  );
}
