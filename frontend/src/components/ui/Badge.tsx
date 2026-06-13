// Pill badge primitive over the .badge classes.

import type { HTMLAttributes } from "react";

type Tone = "default" | "accent" | "success" | "warning";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "default", className = "", ...props }: BadgeProps) {
  const toneClass = tone === "default" ? "" : `badge--${tone}`;
  return <span className={`badge ${toneClass} ${className}`.trim()} {...props} />;
}
