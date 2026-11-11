"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function OrganizationNav({
  orgSlug,
  canManageSettings,
}: {
  orgSlug: string;
  canManageSettings: boolean;
}) {
  const pathname = usePathname();

  const base = `/app/${orgSlug}`;

  const items = [
    { href: base, label: "Overview", isActive: pathname === base },
    {
      href: `${base}/settings/members`,
      label: "Members",
      isActive: pathname.startsWith(`${base}/settings/members`),
    },
    ...(canManageSettings
      ? [
          {
            href: `${base}/settings`,
            label: "Settings",
            isActive: pathname === `${base}/settings`,
          },
        ]
      : []),
  ];

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.isActive ? "page" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-sm transition-colors",
            item.isActive
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
