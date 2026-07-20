"use client";

import { useState, useTransition } from "react";
import { CircleNotchIcon, TrashIcon } from "@phosphor-icons/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/lib/actions/delete-product";

type DeleteProductButtonProps = {
  productId: string;
  productLabel: string;
};

export function DeleteProductButton({ productId, productLabel }: DeleteProductButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setError(null);
        setOpen(nextOpen);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Elimina ${productLabel}`}
            className="relative after:absolute after:-inset-2.5"
          />
        }
      >
        <TrashIcon className="size-3.5" />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare questo prodotto?</AlertDialogTitle>
          <AlertDialogDescription>
            {productLabel} verrà eliminato definitivamente, insieme a tutte le sue immagini.
            L&apos;azione non è reversibile.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p
            role="alert"
            className="border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleDelete} className="gap-1.5">
            {pending && <CircleNotchIcon className="size-3.5 animate-spin" />}
            {pending ? "Eliminazione…" : "Elimina"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
