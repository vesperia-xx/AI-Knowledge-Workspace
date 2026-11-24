"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { signIn } from "next-auth/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Entrada de un clic a la cuenta de demostración del portafolio.
 *
 * La cuenta es compartida y solo contiene un documento de ejemplo (el manual
 * interno de Northwind Labs), así que las credenciales pueden vivir en el
 * cliente: no hay datos reales que proteger.
 */
const DEMO_EMAIL = "demo@ricardoaguilera.dev";
const DEMO_PASSWORD = "PortfolioDemo2026!";

export default function DemoPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    signIn("credentials", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      redirectTo: "/dashboard",
    }).catch(() => setFailed(true));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opening the demo workspace</CardTitle>
        <CardDescription>
          Signing you in to Northwind Labs, a workspace with a sample handbook
          you can question.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {failed ? (
          <p role="alert" className="text-sm text-destructive">
            The demo could not start. You can try signing in manually.
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon aria-hidden className="size-4 animate-spin" />
            This takes a second.
          </p>
        )}

        <Link
          href="/login"
          className="text-sm text-foreground underline-offset-4 hover:underline"
        >
          Go to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
