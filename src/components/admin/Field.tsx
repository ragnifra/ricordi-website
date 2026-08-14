import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
};

// The labelled wrapper every control in the admin product form sits in.
// Lives in its own module so both ProductFormFields (server-renderable) and
// CategorySizeFields (a Client Component) can use it without importing each
// other.
export function Field({ label, htmlFor, error, optional, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="flex items-center justify-between text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase"
      >
        <span>{label}</span>
        {optional && <span className="text-muted-foreground/70 normal-case">opzionale</span>}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-[0.7rem] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
