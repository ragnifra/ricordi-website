import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/admin/LogoutButton";

const ADMIN_NAV_LINKS = [
  { href: "/admin/prodotti", label: "Prodotti" },
  { href: "/admin/nuovo-prodotto", label: "Nuovo prodotto" },
];

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="flex flex-col gap-3 border-b px-4 py-3 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-medium tracking-[0.15em] text-foreground uppercase">
            Admin
          </span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {ADMIN_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
