"use client";
import { ButtonHTMLAttributes } from "react";
import type { ButtonVariant } from "@/lib/types";

export function Button({
  variant = "bp",
  sm = false,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; sm?: boolean }) {
  const cls = ["btn", variant, sm ? "sm" : "", className].filter(Boolean).join(" ");
  return <button className={cls} {...rest} />;
}
