"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel, shiftMonth } from "@/lib/money";

export function MonthNav({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <div className="flex w-full shrink-0 items-center gap-1 rounded-xl border bg-card/70 p-1 sm:w-auto">
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft />
      </Button>
      <span className="min-w-0 flex-1 px-1 text-center text-sm sm:min-w-32 sm:flex-none">{monthLabel(month)}</span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}>
        <ChevronRight />
      </Button>
    </div>
  );
}
