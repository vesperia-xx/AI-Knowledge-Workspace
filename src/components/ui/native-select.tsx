import { cn } from "@/lib/utils";

/**
 * A native `<select>` with the same visual language as `Input`.
 *
 * shadcn's Select is a composite widget with its own state; for a handful of
 * options inside a form, the platform control is smaller, accessible by default
 * and works before hydration.
 */
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 rounded-lg border border-input bg-transparent px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}
