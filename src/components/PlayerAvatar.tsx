import { cn } from "@/lib/utils";

export function PlayerAvatar({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-2 text-sm font-bold text-primary",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="size-full object-cover" />
      ) : (
        (initials || "?")
      )}
    </span>
  );
}
