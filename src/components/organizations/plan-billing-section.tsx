"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function PlanBillingSection({
  orgSlug,
  currentPlan,
  currentDocs,
  maxDocs,
  currentMembers,
  maxMembers,
}: {
  orgSlug: string;
  currentPlan: string;
  currentDocs: number;
  maxDocs: number;
  currentMembers: number;
  maxMembers: number;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleUpgrade(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/billing/simulate-upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Error al actualizar el plan");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Plan Actual</p>
          <p className="text-xl font-bold uppercase tracking-wide text-primary">{currentPlan}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">Documentos</p>
          <p className="mt-1 text-2xl font-semibold">
            {currentDocs} / {maxDocs === 10000 ? "Ilimitados" : maxDocs}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (currentDocs / (maxDocs === 10000 ? 1000 : maxDocs)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">Miembros</p>
          <p className="mt-1 text-2xl font-semibold">
            {currentMembers} / {maxMembers === 100 ? "Ilimitados" : maxMembers}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (currentMembers / (maxMembers === 100 ? 20 : maxMembers)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 border-t pt-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Cambiar Plan (Checkout Simulado)</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant={currentPlan === "free" ? "outline" : "default"}
            disabled={currentPlan === "free" || loading !== null}
            onClick={() => handleUpgrade("free")}
          >
            {loading === "free" ? "Actualizando..." : "Cambiar a Free"}
          </Button>
          <Button
            variant={currentPlan === "pro" ? "outline" : "default"}
            disabled={currentPlan === "pro" || loading !== null}
            onClick={() => handleUpgrade("pro")}
          >
            {loading === "pro" ? "Actualizando..." : "Cambiar a Pro"}
          </Button>
          <Button
            variant={currentPlan === "enterprise" ? "outline" : "default"}
            disabled={currentPlan === "enterprise" || loading !== null}
            onClick={() => handleUpgrade("enterprise")}
          >
            {loading === "enterprise" ? "Actualizando..." : "Cambiar a Enterprise"}
          </Button>
        </div>
      </div>
    </div>
  );
}
