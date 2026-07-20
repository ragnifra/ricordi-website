"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient, createClient } from "@/lib/supabase/server";

export type ManualProductStatus = "available" | "sold";

export type SetProductStatusResult = {
  error: string | null;
};

// Manual override for stock the admin sold or relisted outside the site
// (in person, Instagram DM, etc.) — the normal "sold" path is the Stripe
// webhook (checkout.session.completed), which also stamps
// sold_by_session_id; that column is intentionally left untouched here since
// it's the idempotency key the webhook uses to tell a benign redelivery
// apart from a genuine double-sale (see AGENTS.md / the webhook handler).
export async function setProductStatus(
  productId: string,
  status: ManualProductStatus
): Promise<SetProductStatusResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessione scaduta. Accedi di nuovo." };
  }

  const admin = createAdminClient();

  const update =
    status === "sold"
      ? { status, reserved_until: null, sold_at: new Date().toISOString() }
      // Relisting clears the previous sale's bookkeeping too, so the stock
      // table doesn't keep showing a stale sold date for a piece that's
      // available again.
      : { status, reserved_until: null, sold_at: null, sold_by_session_id: null };

  const { data, error } = await admin
    .from("products")
    .update(update)
    .eq("id", productId)
    .select("slug")
    .maybeSingle();

  if (error) {
    console.error("setProductStatus: update failed", productId, status, error);
    return { error: "Aggiornamento non riuscito. Riprova." };
  }

  if (!data) {
    return { error: "Prodotto non trovato." };
  }

  revalidatePath("/admin/prodotti");
  revalidatePath("/catalogo");
  revalidatePath(`/prodotto/${data.slug}`);

  return { error: null };
}
