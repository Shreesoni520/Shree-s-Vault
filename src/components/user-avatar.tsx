"use client";

import { avatarInitials, cn } from "@/lib/utils";

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={cn("size-8 shrink-0 rounded-full object-cover", className)} />
    );
  }
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary",
        className
      )}
    >
      {avatarInitials(name || "?")}
    </div>
  );
}
