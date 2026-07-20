import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAdminProductById } from "@/lib/admin/products";
import { EditProductForm } from "@/components/admin/EditProductForm";

export const metadata: Metadata = {
  title: "Modifica prodotto — Admin",
};

type ModificaProdottoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModificaProdottoPage({ params }: ModificaProdottoPageProps) {
  const { id } = await params;
  const product = await getAdminProductById(id);

  if (!product) {
    notFound();
  }

  return <EditProductForm product={product} />;
}
