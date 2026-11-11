"use client";

import Link from "next/link";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Organization = { id: string; name: string; slug: string };

export function OrganizationSwitcher({
  current,
  organizations,
}: {
  current: Organization;
  organizations: Organization[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-1.5 px-2" />}
      >
        <span className="max-w-40 truncate font-medium">{current.name}</span>
        <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>

        {organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            render={<Link href={`/app/${organization.slug}`} />}
          >
            <span className="truncate">{organization.name}</span>
            {organization.id === current.id ? (
              <CheckIcon className="ml-auto size-4" />
            ) : null}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/onboarding" />}>
          <PlusIcon className="size-4" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
