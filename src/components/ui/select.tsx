"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

type MenuBox = { top: number; left: number; width: number; maxHeight: number; openUp: boolean };

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
  const [box, setBox] = useState<MenuBox | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  function placeMenu() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.max(rect.width, 168);
    const left =
      align === "end"
        ? Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8)
        : Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(224, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setBox({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left,
      width,
      maxHeight,
      openUp,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
  }, [open, align, options.length]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onReposition() {
      placeMenu();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, align]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          placeMenu();
          setOpen(true);
        }}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border-2 border-black/15 bg-background px-2.5 text-left text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/30 dark:bg-[#14141c]"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open &&
        box &&
        createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            style={{
              top: box.openUp ? undefined : box.top,
              bottom: box.openUp ? window.innerHeight - box.top : undefined,
              left: box.left,
              width: box.width,
              maxHeight: box.maxHeight,
            }}
            className="fixed z-[500] overflow-auto rounded-xl border-2 border-black/25 bg-white p-1 text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.22)] dark:border-white/50 dark:bg-[#1a1a26] dark:text-white dark:shadow-[0_20px_56px_rgba(0,0,0,0.72)]"
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
                      "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-black/6 dark:hover:bg-white/10",
                      isActive && "bg-black/8 dark:bg-white/12"
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
          </ul>,
          document.body
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
    <div className="flex rounded-lg border border-border bg-card p-0.5 dark:border-white/20">
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
