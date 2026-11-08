import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <SparklesIcon className="size-4" />
      </span>
      <span className="text-[0.95rem]">Recall</span>
    </Link>
  );
}
