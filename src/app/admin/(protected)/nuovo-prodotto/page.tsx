import type { Metadata } from "next";

import { NewProductForm } from "@/components/admin/NewProductForm";

export const metadata: Metadata = {
  title: "Nuovo prodotto — Admin",
};

export default function NuovoProdottoPage() {
  return <NewProductForm />;
}
