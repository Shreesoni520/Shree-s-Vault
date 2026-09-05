import { APP_NAME, APP_NAME_LEAD, APP_NAME_TAIL } from "@/lib/brand";
import { cn } from "@/lib/utils";

const MARK = "/shreevault-s.png?v=7";

export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={MARK} alt="" className={cn("size-8 object-contain p-[15%]", className)} />
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white dark:bg-black",
        className,
        "rounded-full"
      )}
    >
      <Logo className="size-full" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline whitespace-nowrap tracking-tight", className)} aria-label={APP_NAME}>
      <span className="font-semibold">{APP_NAME_LEAD}</span>
      <span className="font-semibold text-primary">{APP_NAME_TAIL}</span>
    </span>
  );
}
