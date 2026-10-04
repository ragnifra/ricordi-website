import { Fragment } from "react";

const BRAND = "Ricordi Archive";

// Renders a dictionary string with every "Ricordi Archive" wrapped in
// translate="no", so a browser translator can't turn "Ricordi" into
// "memories". Splitting a string (rather than writing the spans in JSX) also
// sidesteps the lost-space gotcha around </span> noted in AGENTS.md.
export function BrandText({ text }: { text: string }) {
  const parts = text.split(BRAND);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 && <span translate="no">{BRAND}</span>}
      {part}
    </Fragment>
  ));
}
