"use client";

// Button primitive over the ported .btn classes. Defaults to type="button" so
// it never submits a form unless explicitly told to.

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  large?: boolean;
}

export function Button({
  variant = "primary",
  large = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = ["btn", `btn-${variant}`, large ? "btn-lg" : "", className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...props} />;
}
