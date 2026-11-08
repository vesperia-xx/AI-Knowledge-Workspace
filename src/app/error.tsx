"use client";

import { useEffect } from "react";
import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        Error
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong on our side
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The action could not be completed. Try again. If it keeps happening,
        the error reference is{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          {error.digest ?? "unavailable"}
        </code>
        .
      </p>
      <Button onClick={reset} variant="outline">
        <RotateCcwIcon />
        Try again
      </Button>
    </div>
  );
}
