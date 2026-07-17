"use client";
import { ButtonHTMLAttributes } from "react";

type Variant = "bp" | "bg" | "bs" | "brd";

export function Button({
  variant = "bp",
  sm = false,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; sm?: boolean }) {
  const cls = ["btn", variant, sm ? "sm" : "", className].filter(Boolean).join(" ");
  return <button className={cls} {...rest} />;
}
