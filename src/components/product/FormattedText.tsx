import { parseTextBlocks } from "@/lib/rich-text";

type FormattedTextProps = {
  value: string;
};

// Renders a plain-text field with the author's own layout: their line breaks
// are kept, and runs of lines starting with "-" or "•" become a real list.
//
// The value is interpolated as text, never as HTML — React escapes it, so an
// admin typing markup gets the markup shown, not executed.
export function FormattedText({ value }: FormattedTextProps) {
  const blocks = parseTextBlocks(value);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2 text-sm text-foreground">
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ul key={index} className="space-y-1">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2">
                <span aria-hidden="true" className="text-muted-foreground">
                  —
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        )
      )}
    </div>
  );
}
