"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Choose",
  className,
  align = "start",
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/20 dark:bg-input/40"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-[400] mt-1 max-h-56 min-w-full overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-foreground/15 dark:border-white/25 dark:bg-[#161622] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] dark:ring-white/10",
            align === "end" && "right-0"
          )}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value || "empty"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted",
                    isActive && "bg-muted"
                  )}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                  {isActive && <Check className="size-3.5 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function KindPills({
  value,
  onChange,
  includeAll = true,
}: {
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
}) {
  const items = [
    ...(includeAll ? [{ value: "", label: "All" }] : []),
    { value: "income", label: "Income" },
    { value: "expense", label: "Spend" },
    ...(includeAll ? [{ value: "transfer", label: "Moves" }] : []),
  ];
  return (
    <div className="flex rounded-lg border bg-card/50 p-0.5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            "h-7 rounded-md px-2.5 text-sm",
            value === item.value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
