import Link from "next/link";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Organization = { id: string; name: string; slug: string };

/**
 * Native <details> instead of a JS menu: it opens with zero hydration and
 * cannot be broken by a client-side error. The panel is positioned under the
 * trigger and closes on navigation because the page remounts.
 */
export function OrganizationSwitcher({
  current,
  organizations,
}: {
  current: Organization;
  organizations: Organization[];
}) {
  return (
    <details className="group relative">
      <summary
        className={cn(
          "flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-sm",
          "hover:bg-accent hover:text-accent-foreground",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span className="max-w-40 truncate font-medium">{current.name}</span>
        <ChevronsUpDownIcon className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Workspaces
        </p>

        {organizations.map((organization) => (
          <Link
            key={organization.id}
            href={`/app/${organization.slug}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <span className="truncate">{organization.name}</span>
            {organization.id === current.id ? (
              <CheckIcon className="ml-auto size-4" />
            ) : null}
          </Link>
        ))}

        <div className="my-1 h-px bg-border" />

        <Link
          href="/onboarding"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <PlusIcon className="size-4" />
          Create workspace
        </Link>
      </div>
    </details>
  );
}
