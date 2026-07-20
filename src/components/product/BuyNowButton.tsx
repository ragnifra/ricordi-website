"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function BuyNowButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full text-xs font-medium tracking-[0.15em] uppercase"
    >
      {pending ? "Redirecting…" : "Buy now"}
    </Button>
  );
}
