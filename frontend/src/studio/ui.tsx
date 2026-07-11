"use client";

import type { ReactNode } from "react";

/** Small, dependency-free form controls for the Studio panels. */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-[64px] resize-y`} />;
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 shrink-0 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  type = "button",
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, string> = {
    primary: "bg-slate-800 text-white hover:bg-slate-700",
    ghost: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${styles[variant]}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Collapsible section group (native details/summary). */
export function Group({
  title,
  children,
  open = false,
  frame,
  action,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  /** when set, opening this group scrolls the live preview to that section frame */
  frame?: string;
  /** right-aligned control in the header (clicks don't toggle the group) */
  action?: ReactNode;
}) {
  return (
    <details
      open={open}
      onToggle={
        frame
          ? (e) => {
              if ((e.currentTarget as HTMLDetailsElement).open) {
                try {
                  window.dispatchEvent(new CustomEvent("preview:scrollTo", { detail: frame }));
                } catch {
                  /* ignore */
                }
              }
            }
          : undefined
      }
      className="mb-2 rounded-lg border border-slate-200 bg-slate-50/60"
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-700">
        {action ? (
          <span
            className="float-right"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {action}
          </span>
        ) : null}
        {title}
      </summary>
      <div className="px-3 pb-3 pt-1">{children}</div>
    </details>
  );
}
