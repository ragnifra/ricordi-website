"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SIZE_GUIDE_TABLE_IDS, getSizeGuideTable, type SizeGuideTableId } from "@/lib/size-guide";
import { useCopy } from "@/components/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

type SizeGuideDialogProps = {
  // The chart this product's gender+category is measured by; the others stay
  // one tap away.
  initialTableId: SizeGuideTableId;
};

export function SizeGuideDialog({ initialTableId }: SizeGuideDialogProps) {
  const [tableId, setTableId] = useState<SizeGuideTableId>(initialTableId);
  const copy = useCopy();
  const table = getSizeGuideTable(tableId);
  const tableCopy = copy.sizeGuide.tables[tableId];

  return (
    <Dialog
      onOpenChange={(open) => {
        // Reopening always lands back on this product's own chart, whatever
        // was last browsed.
        if (open) setTableId(initialTableId);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-[0.7rem] tracking-[0.1em] text-muted-foreground uppercase underline underline-offset-4 transition-colors hover:text-foreground"
          />
        }
      >
        {copy.sizeGuide.trigger}
      </DialogTrigger>

      <DialogContent closeLabel={copy.close} className="sm:max-w-2xl">
        <DialogHeader className="border-b">
          <DialogTitle className="text-xs font-medium tracking-[0.15em] uppercase">
            {copy.sizeGuide.trigger}
          </DialogTitle>
          <DialogDescription>{copy.sizeGuide.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            {SIZE_GUIDE_TABLE_IDS.map((id) => {
              const active = id === tableId;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTableId(id)}
                  className={cn(
                    "flex h-11 items-center border px-3 text-[0.7rem] tracking-[0.1em] uppercase transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  {copy.sizeGuide.tables[id].label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-xs tracking-[0.1em] text-foreground uppercase">{tableCopy.title}</p>
            {tableCopy.note && <p className="text-xs text-muted-foreground">{tableCopy.note}</p>}

            {/* Five columns don't fit 375px, so the table scrolls inside its
                own box rather than pushing the dialog sideways. */}
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {tableCopy.columns.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="px-3 py-2.5 text-left text-[0.65rem] font-medium tracking-[0.1em] text-muted-foreground uppercase"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => (
                    <tr key={row[0]} className="border-b border-border/50 last:border-b-0">
                      {row.map((cell, index) => (
                        <td
                          key={index}
                          className={cn(
                            "px-3 py-2.5",
                            index === 0 ? "font-medium text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            {copy.sizeGuide.disclaimer}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
