import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Brand />
          <span className="text-xs text-muted-foreground">
            AI knowledge for your team
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Recall. A portfolio project.
        </p>
      </div>
    </footer>
  );
}
