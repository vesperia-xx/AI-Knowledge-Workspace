import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const destination = callbackUrl ?? "/dashboard";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to your workspace to keep asking your documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm callbackUrl={destination} />

        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium">Evaluating the project?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open a shared demo workspace with a sample handbook. No sign-up
            needed.
          </p>
          <Link
            href="/demo"
            className="mt-3 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Explore the demo workspace &rarr;
          </Link>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          No account yet?{" "}
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(destination)}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
