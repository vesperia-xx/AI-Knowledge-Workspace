"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_UPLOAD_BYTES } from "@/server/documents/file-types";

export function UploadDocumentForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(
        `/api/orgs/${encodeURIComponent(orgSlug)}/documents`,
        { method: "POST", body: data },
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "The upload failed. Try again.");
        return;
      }

      formRef.current?.reset();
      // The server component re-renders and lists the new document.
      router.refresh();
    } catch {
      setError("The upload failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Input
          type="file"
          name="file"
          accept=".pdf,.docx,.txt,.md"
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "upload-error" : "upload-hint"}
          className="h-8 py-1 file:mr-2"
        />
        <p id="upload-hint" className="text-xs text-muted-foreground">
          PDF, Word (.docx), Markdown or plain text. Up to{" "}
          {MAX_UPLOAD_BYTES / (1024 * 1024)} MB. Text is extracted and split into
          passages automatically.
        </p>
        {error ? (
          <p id="upload-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <UploadIcon />
        )}
        {pending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
