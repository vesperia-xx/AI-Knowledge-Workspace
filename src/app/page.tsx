import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  FileTextIcon,
  LockIcon,
  MessageSquareIcon,
  PlugIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";

const features = [
  {
    icon: FileTextIcon,
    title: "Upload what you already have",
    description:
      "PDF, DOCX and TXT. Files are parsed, chunked and embedded asynchronously while the UI reports the status.",
  },
  {
    icon: MessageSquareIcon,
    title: "Answers with citations",
    description:
      "Every response is grounded in retrieved passages, so the team can verify the source instead of trusting a black box.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Isolated by organization",
    description:
      "Every query is scoped to the caller's workspace. One tenant can never retrieve another tenant's documents.",
  },
  {
    icon: PlugIcon,
    title: "Tools, not just chat",
    description:
      "The assistant can call tools to search documents, inspect usage or create a task when the answer needs an action.",
  },
  {
    icon: BarChart3Icon,
    title: "Usage you can explain",
    description:
      "Tokens, queries, documents and seats are metered per workspace and compared against the current plan.",
  },
  {
    icon: ZapIcon,
    title: "Built for real workloads",
    description:
      "Background processing, retries and streaming responses, not a single request that blocks the browser.",
  },
];

const steps = [
  {
    title: "Connect your knowledge",
    body: "Upload the documents your team already relies on. You keep ownership; we keep them scoped.",
  },
  {
    title: "Ask in plain language",
    body: "Retrieval finds the relevant passages, the model answers with them, and sources stay one click away.",
  },
  {
    title: "Act on the answer",
    body: "When text is not enough, the assistant calls a tool and carries out the action in your workspace.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-muted),transparent)]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                <SparklesIcon className="size-3.5" />
                Private AI for internal knowledge
              </span>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Every answer your team needs, grounded in your own documents.
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
                Recall turns internal documentation into an assistant that cites
                its sources, respects workspace boundaries and can take action
                when a question turns into a task.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className={buttonVariants({ size: "lg", className: "h-10 px-5" })}
                >
                  Start free
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "h-10 px-5",
                  })}
                >
                  Sign in
                </Link>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Free plan with document and query limits. No credit card.
              </p>
            </div>

            <ChatPreview />
          </div>
        </section>

        <section id="product" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              A knowledge product, not a chat box
            </h2>
            <p className="mt-3 text-muted-foreground">
              The interesting work happens around the model: ingestion,
              retrieval, permissions, metering and the parts that keep answers
              trustworthy.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="bg-background p-6">
                <feature.icon className="size-4 text-muted-foreground" />
                <h3 className="mt-4 text-sm font-medium">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="security" className="border-y border-border/60 bg-muted/40">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <LockIcon className="size-3.5" />
                Security by default
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                Your data stays in your workspace
              </h2>
              <p className="mt-3 text-muted-foreground">
                Multi-tenancy is enforced in the data access layer, not in the
                UI. Roles decide who can invite, upload, delete or change
                billing.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title}>
                  <span className="text-xs font-mono text-muted-foreground">
                    0{index + 1}
                  </span>
                  <h3 className="mt-2 text-sm font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="rounded-xl border border-border bg-background p-8 sm:p-12">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Start on Free. Upgrade when the team does.
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Free covers a first workspace. Pro raises document, query and
                  storage limits as usage grows.
                </p>
              </div>
              <Link
                href="/register"
                className={buttonVariants({ size: "lg", className: "h-10 shrink-0 px-5" })}
              >
                Create a workspace
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="mx-auto mt-14 w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="ml-2 text-xs text-muted-foreground">
          Recall · People operations
        </span>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-lg bg-primary px-3.5 py-2 text-sm text-primary-foreground">
            What is our vacation policy for the first year?
          </p>
        </div>

        <div className="flex gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
            <SparklesIcon className="size-3.5" />
          </span>
          <div className="min-w-0 space-y-3">
            <p className="text-sm leading-relaxed">
              Full-time employees accrue 20 days of paid vacation during their
              first year, prorated from the start date. Requests go through your
              manager at least two weeks in advance; unused days roll over up to
              five days into the next calendar year.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                <FileTextIcon className="size-3" />
                Employee handbook.pdf · p. 12
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                <FileTextIcon className="size-3" />
                PTO policy.docx · § 2.1
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
