"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// Backstop for anything in the admin area that throws outside a server
// action's own error handling — a failed request to a server action included.
//
// Without this the admin got nothing at all when a submission failed at the
// transport level: the spinner stopped, the form sat there, and no message ever
// appeared. Whatever else goes wrong here, something visible has to happen.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("admin error boundary", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-16">
      <h1 className="text-sm font-medium tracking-[0.15em] text-foreground uppercase">
        Qualcosa è andato storto
      </h1>
      <p className="text-xs text-muted-foreground">
        L&apos;operazione non è stata completata. Riprova; se il problema persiste, ricarica la
        pagina.
      </p>
      {error.digest && (
        <p className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase">
          Riferimento: {error.digest}
        </p>
      )}
      <Button
        type="button"
        onClick={reset}
        className="h-11 gap-2 text-xs font-medium tracking-[0.1em] uppercase"
      >
        Riprova
      </Button>
    </div>
  );
}
