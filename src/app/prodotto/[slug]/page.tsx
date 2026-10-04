import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductBySlug, getSizeGroup } from "@/lib/catalog";
import { listMeasurements } from "@/lib/product-measurements";
import { getSizeGuideTableIdForScale } from "@/lib/size-guide";
import { getSizeScaleId } from "@/lib/taxonomy";
import { FormattedText } from "@/components/product/FormattedText";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ReservedAutoRefresh } from "@/components/product/ReservedAutoRefresh";
import { SizeGuideDialog } from "@/components/product/SizeGuideDialog";
import { SizeSelector } from "@/components/product/SizeSelector";
import { Button } from "@/components/ui/button";
import { formatMeasurement, formatPrice } from "@/lib/i18n/format";
import { conditionLabel, sizeLabel } from "@/lib/i18n/labels";
import { productText } from "@/lib/i18n/product-text";
import { getCopy, getLanguage } from "@/lib/i18n/server";

type ProdottoPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: ProdottoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return {};

  return {
    title: `${product.brand} — ${product.name}`,
  };
}

export default async function ProdottoPage({ params, searchParams }: ProdottoPageProps) {
  const { slug } = await params;
  const { checkout } = await searchParams;

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Only pieces sold in several sizes carry a group_id; a one-off piece keeps
  // showing its size as a plain value, exactly as before.
  const sizeGroup = product.groupId ? await getSizeGroup(product.groupId) : [];

  // Which conversion chart this piece is measured by. Null for a bag or a
  // belt — there is nothing to convert, so no guide is offered.
  const sizeGuideTableId = getSizeGuideTableIdForScale(
    getSizeScaleId(product.gender, product.category)
  );

  const measurements = listMeasurements(product.category, product.measurements);

  const lang = await getLanguage();
  const copy = await getCopy();

  // Admin free text, resolved for the page language (Italian only for now —
  // see src/lib/i18n/product-text.ts). Each block carries its own lang, and
  // the note shows whenever one of them isn't in the page language.
  const description = productText(product, "description", lang);
  const composition = productText(product, "composition", lang);
  const authenticityNotes = productText(product, "authenticityNotes", lang);
  const showsOtherLanguage = [description, composition, authenticityNotes].some(
    (text) => text && text.lang !== lang
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {checkout === "unavailable" && (
          <p className="mb-6 border border-border px-3 py-2 text-xs text-muted-foreground uppercase tracking-[0.05em]">
            {copy.product.banners.unavailable}
          </p>
        )}
        {checkout === "cancelled" && (
          <p className="mb-6 border border-border px-3 py-2 text-xs text-muted-foreground uppercase tracking-[0.05em]">
            {copy.product.banners.cancelled}
          </p>
        )}
        {checkout === "error" && (
          <p className="mb-6 border border-destructive px-3 py-2 text-xs text-destructive uppercase tracking-[0.05em]">
            {copy.product.banners.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} alt={product.name} />

          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <p translate="no" className="text-xs tracking-[0.15em] text-muted-foreground uppercase">
                {product.brand}
              </p>
              <h1 className="text-2xl font-medium text-foreground">{product.name}</h1>
              <p translate="no" className="text-lg text-foreground">
                {formatPrice(lang, product.price)}
              </p>
            </div>

            {showsOtherLanguage && (
              <p className="-mt-3 text-xs text-muted-foreground">{copy.product.italianTextNote}</p>
            )}

            {description && (
              <div className="space-y-1.5">
                <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  {copy.product.description}
                </p>
                <FormattedText value={description.text} lang={description.lang} />
              </div>
            )}

            <dl className="grid grid-cols-2 gap-4 border-y py-4 text-xs">
              <div className={sizeGroup.length > 0 ? "col-span-2 space-y-2" : "space-y-1"}>
                <dt className="flex flex-wrap items-center justify-between gap-2 tracking-[0.1em] text-muted-foreground uppercase">
                  <span>{copy.product.size}</span>
                  {sizeGuideTableId && <SizeGuideDialog initialTableId={sizeGuideTableId} />}
                </dt>
                <dd className="text-foreground">
                  {sizeGroup.length > 0 ? (
                    <SizeSelector
                      gender={product.gender}
                      category={product.category}
                      currentSlug={product.slug}
                      members={sizeGroup}
                    />
                  ) : (
                    <span translate="no">{sizeLabel(copy, product.size)}</span>
                  )}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="tracking-[0.1em] text-muted-foreground uppercase">
                  {copy.product.condition}
                </dt>
                <dd className="text-foreground">{conditionLabel(copy, product.condition)}</dd>
              </div>
            </dl>

            {measurements.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  {copy.product.measurements}
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {measurements.map((entry) => (
                    <div key={entry.id} className="flex justify-between gap-2 border-b py-1">
                      <dt className="text-muted-foreground">
                        {copy.taxonomy.measurements[entry.id]}
                      </dt>
                      <dd className="whitespace-nowrap text-foreground">
                        {formatMeasurement(lang, entry.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {composition && (
              <div className="space-y-1.5">
                <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  {copy.product.composition}
                </p>
                <p lang={composition.lang} className="text-sm text-foreground">
                  {composition.text}
                </p>
              </div>
            )}

            {authenticityNotes && (
              <div className="space-y-1.5">
                <p className="text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  {copy.product.authenticityNotes}
                </p>
                <FormattedText value={authenticityNotes.text} lang={authenticityNotes.lang} />
              </div>
            )}

            <div className="pt-2">
              {product.status === "available" && (
                <Button
                  render={<Link href={`/prodotto/${product.slug}/checkout`} />}
                  nativeButton={false}
                  className="w-full text-xs font-medium tracking-[0.15em] uppercase"
                >
                  {copy.product.buy}
                </Button>
              )}

              {product.status === "reserved" && (
                <>
                  <ReservedAutoRefresh />
                  <Button disabled className="w-full text-xs font-medium tracking-[0.1em] uppercase">
                    {copy.product.reserved}
                  </Button>
                </>
              )}

              {product.status === "sold" && (
                <Button disabled className="w-full text-xs font-medium tracking-[0.1em] uppercase">
                  {copy.product.sold}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
