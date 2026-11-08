import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        By continuing you agree to the terms of this demo project.
      </footer>
    </div>
  );
}
