/*
 * Tebex descriptions → blocks the Marketplace draws in its own style.
 *
 * Descriptions come from Tebex's editor as HTML: text wrapped in spans with
 * inline fonts and sizes, list items that hold a heading or a paragraph,
 * bold perk names, inline code for commands (/fly). Instead of trusting
 * that markup on the page, it's read into a few plain blocks that keep what
 * the text says and how it's emphasised:
 *
 *   heading     h1–h3
 *   paragraph   p, div and loose text; h4–h6 become "lead" paragraphs (the
 *               editor offers them as bigger text, not as section titles)
 *   list        ul / ol, one level of nesting, whatever wraps each item
 *   rule        hr
 *
 * Inside a block: bold, italic, underline, strikethrough, inline code, line
 * breaks and https links. Inline styles (fonts, sizes, colours), images,
 * embeds and scripts are dropped, and nothing is ever rendered as HTML.
 *
 * Pure functions: used on the server (tebex.ts) and in the browser.
 */

export type RichSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  href?: string;
};

export type RichListItem = { depth: number; spans: RichSpan[] };

export type RichBlock =
  | { kind: "heading"; spans: RichSpan[] }
  | { kind: "paragraph"; lead: boolean; spans: RichSpan[] }
  | { kind: "list"; ordered: boolean; items: RichListItem[] }
  | { kind: "rule" };

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  divide: "÷",
  deg: "°",
  plusmn: "±",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  euro: "€",
  pound: "£",
  cent: "¢",
  yen: "¥",
  sect: "§",
  para: "¶",
  iexcl: "¡",
  iquest: "¿",
  larr: "←",
  rarr: "→",
  uarr: "↑",
  darr: "↓",
  harr: "↔",
  hearts: "♥",
};

function decodeEntities(text: string) {
  return text.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity: string) => {
    if (entity[0] !== "#") {
      return NAMED_ENTITIES[entity] ?? match;
    }

    const code = entity[1] === "x" || entity[1] === "X"
      ? Number.parseInt(entity.slice(2), 16)
      : Number.parseInt(entity.slice(1), 10);
    const valid = Number.isInteger(code) && code > 0 && code <= 0x10ffff
      && !(code >= 0xd800 && code <= 0xdfff);

    return valid ? String.fromCodePoint(code) : match;
  });
}

type Marks = Omit<RichSpan, "text">;

const sameMarks = (a: Marks, b: Marks) =>
  Boolean(a.bold) === Boolean(b.bold)
  && Boolean(a.italic) === Boolean(b.italic)
  && Boolean(a.underline) === Boolean(b.underline)
  && Boolean(a.strike) === Boolean(b.strike)
  && Boolean(a.code) === Boolean(b.code)
  && (a.href ?? "") === (b.href ?? "");

/* Tags whose content is never text on the page. */
const SKIPPED = new Set([
  "script", "style", "noscript", "template", "iframe", "object", "embed",
  "svg", "math", "head", "title", "select", "textarea", "button", "video",
  "audio", "canvas",
]);
const VOID = new Set([
  "img", "input", "source", "track", "wbr", "meta", "link", "col", "area",
  "base", "param", "embed",
]);
const TEXT_BLOCKS = new Set([
  "p", "div", "section", "article", "header", "footer", "aside", "main",
  "blockquote", "pre", "figure", "figcaption", "address", "dd", "dt",
  "h1", "h2", "h3", "h4", "h5", "h6",
]);

const TOKEN =
  /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|<|[^<]+/g;

function linkFrom(attributes: string) {
  const match = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);
  const href = decodeEntities((match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim());

  return /^https:\/\/[^\s]+$/i.test(href) ? href : "";
}

/* Runs with the same marks merged; no spaces at the edges or around line
   breaks, no double spaces or blank lines. */
function tidy(spans: RichSpan[]) {
  const merged: RichSpan[] = [];

  for (const span of spans) {
    const last = merged[merged.length - 1];

    if (!span.text) {
      continue;
    }
    if (last && sameMarks(last, span)) {
      last.text += span.text;
    } else {
      merged.push({ ...span });
    }
  }

  // Treat the start like the spot after a line break
  let before = "\n";

  for (const span of merged) {
    let text = span.text.replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n");

    text = before === "\n" ? text.replace(/^[ \n]+/, "") : before === " " ? text.replace(/^ +/, "") : text;
    span.text = text;

    if (text) {
      before = text[text.length - 1];
    }
  }

  for (let index = 1; index < merged.length; index += 1) {
    if (merged[index].text.startsWith("\n")) {
      merged[index - 1].text = merged[index - 1].text.replace(/ +$/, "");
    }
  }

  for (let index = merged.length - 1; index >= 0; index -= 1) {
    merged[index].text = merged[index].text.replace(/[ \n]+$/, "");

    if (merged[index].text) {
      break;
    }
  }

  return merged.filter((span) => span.text);
}

export function parseRichText(html: string | null | undefined): RichBlock[] {
  const blocks: RichBlock[] = [];
  const marks = { bold: 0, italic: 0, underline: 0, strike: 0, code: 0 };
  const links: string[] = [];
  // Style of the text block we're in (h4 → lead, h2 → heading), innermost last
  const styles: { heading: boolean; lead: boolean }[] = [];
  let paragraph: { heading: boolean; lead: boolean; spans: RichSpan[] } | null = null;
  // Lists: the block being filled and the open item at each depth
  let list: Extract<RichBlock, { kind: "list" }> | null = null;
  const openItems: (RichListItem | null)[] = [];
  let itemBreak = false;
  let skip = 0;

  const currentMarks = (): Marks => ({
    ...(marks.bold ? { bold: true } : {}),
    ...(marks.italic ? { italic: true } : {}),
    ...(marks.underline ? { underline: true } : {}),
    ...(marks.strike ? { strike: true } : {}),
    ...(marks.code ? { code: true } : {}),
    ...(links.length && links[links.length - 1] ? { href: links[links.length - 1] } : {}),
  });

  const openItem = () => {
    for (let depth = openItems.length - 1; depth >= 0; depth -= 1) {
      if (openItems[depth]) {
        return openItems[depth];
      }
    }
    return null;
  };

  const endParagraph = () => {
    if (!paragraph) {
      return;
    }

    const spans = tidy(paragraph.spans);

    if (spans.length) {
      blocks.push(
        paragraph.heading
          ? { kind: "heading", spans }
          : { kind: "paragraph", lead: paragraph.lead, spans },
      );
    }

    paragraph = null;
  };

  const openParagraphSpans = (): RichSpan[] | undefined => paragraph?.spans;

  const target = (): RichSpan[] => {
    const item = openItem();

    if (item) {
      return item.spans;
    }

    if (!paragraph) {
      const style = styles[styles.length - 1] ?? { heading: false, lead: false };
      paragraph = { ...style, spans: [] };
    }

    return paragraph.spans;
  };

  const addText = (raw: string) => {
    if (skip) {
      return;
    }

    const text = decodeEntities(raw).replace(/[\s ]+/g, " ");

    if (!text.trim() && !(openItem() || paragraph)) {
      // Whitespace between blocks
      return;
    }

    const spans = target();

    if (itemBreak && openItem() && text.trim() && spans.length) {
      spans.push({ text: "\n" });
    }
    if (text.trim()) {
      itemBreak = false;
    }

    spans.push({ ...currentMarks(), text });
  };

  const closeItemsFrom = (depth: number) => {
    for (let index = openItems.length - 1; index >= depth; index -= 1) {
      openItems[index] = null;
    }
    openItems.length = Math.min(openItems.length, depth);
  };

  const listDepth = () => openItems.length;

  for (const token of html?.matchAll(TOKEN) ?? []) {
    const [whole, closing, rawName, attributes = ""] = token;

    if (rawName === undefined) {
      if (whole.startsWith("<!") || whole.startsWith("<!--")) {
        continue;
      }
      addText(whole);
      continue;
    }

    const name = rawName.toLowerCase();
    const selfClosing = /\/\s*$/.test(attributes);

    if (SKIPPED.has(name)) {
      if (!VOID.has(name) && !selfClosing) {
        skip = Math.max(0, skip + (closing ? -1 : 1));
      }
      continue;
    }
    if (skip) {
      continue;
    }

    if (name === "br") {
      target().push({ text: "\n" });
      continue;
    }

    if (name === "hr") {
      if (!openItem()) {
        endParagraph();
        blocks.push({ kind: "rule" });
      }
      continue;
    }

    if (VOID.has(name)) {
      continue;
    }

    switch (name) {
      case "b":
      case "strong":
        marks.bold = Math.max(0, marks.bold + (closing ? -1 : 1));
        continue;
      case "i":
      case "em":
      case "cite":
      case "dfn":
        marks.italic = Math.max(0, marks.italic + (closing ? -1 : 1));
        continue;
      case "u":
      case "ins":
        marks.underline = Math.max(0, marks.underline + (closing ? -1 : 1));
        continue;
      case "s":
      case "strike":
      case "del":
        marks.strike = Math.max(0, marks.strike + (closing ? -1 : 1));
        continue;
      case "code":
      case "kbd":
      case "samp":
      case "tt":
        marks.code = Math.max(0, marks.code + (closing ? -1 : 1));
        continue;
      case "a":
        if (closing) {
          links.pop();
        } else {
          links.push(linkFrom(attributes));
        }
        continue;
      default:
        break;
    }

    if (name === "ul" || name === "ol") {
      if (closing) {
        if (listDepth()) {
          closeItemsFrom(listDepth() - 1);
        }
        if (!listDepth()) {
          list = null;
        }
        itemBreak = false;
        continue;
      }

      if (!list || !listDepth()) {
        endParagraph();
        list = { kind: "list", ordered: name === "ol", items: [] };
        blocks.push(list);
      }

      openItems.push(null);
      continue;
    }

    if (name === "li") {
      if (closing) {
        const depth = Math.max(0, listDepth() - 1);
        if (openItems[depth]) {
          openItems[depth] = null;
        }
        itemBreak = false;
        continue;
      }

      if (!list || !listDepth()) {
        endParagraph();
        list = { kind: "list", ordered: false, items: [] };
        blocks.push(list);
        openItems.push(null);
      }

      const depth = listDepth() - 1;
      const item: RichListItem = { depth: Math.min(depth, 1), spans: [] };
      openItems[depth] = item;
      list.items.push(item);
      itemBreak = false;
      continue;
    }

    if (TEXT_BLOCKS.has(name) || name === "tr" || name === "table") {
      const heading = /^h[1-3]$/.test(name);
      const lead = /^h[4-6]$/.test(name);

      if (openItem()) {
        // Wrappers inside a list item: a second block starts a new line
        if (closing) {
          itemBreak = true;
        }
        continue;
      }

      endParagraph();

      if (TEXT_BLOCKS.has(name)) {
        if (closing) {
          styles.pop();
        } else {
          const parent = styles[styles.length - 1];
          styles.push({
            heading: heading || (!lead && Boolean(parent?.heading)),
            lead: lead || (!heading && Boolean(parent?.lead)),
          });
        }
      }
      continue;
    }

    if ((name === "td" || name === "th") && !closing) {
      // Cells in a row: a space between them
      const spans = openItem()?.spans ?? openParagraphSpans();
      if (spans?.length) {
        spans.push({ text: " " });
      }
    }
    // Everything else (span, font, …) is a transparent wrapper
  }

  endParagraph();

  return blocks
    .map((block): RichBlock | null => {
      if (block.kind !== "list") {
        return block;
      }

      const items = block.items
        .map((item) => ({ depth: item.depth, spans: tidy(item.spans) }))
        .filter((item) => item.spans.length);

      return items.length ? { ...block, items } : null;
    })
    .filter((block): block is RichBlock => block !== null);
}

export function spansText(spans: RichSpan[]) {
  return spans.map((span) => span.text).join("").replace(/\s+/g, " ").trim();
}

/* The opening line of a description, as plain text (cards, previews). */
export function richSummary(blocks: RichBlock[]) {
  for (const block of blocks) {
    if (block.kind === "paragraph" || block.kind === "heading") {
      return spansText(block.spans);
    }
    if (block.kind === "list" && block.items.length) {
      return block.items.map((item) => spansText(item.spans)).join(" · ");
    }
  }

  return "";
}

/*
 * A description as the featured banner shows it: the text before the first
 * list (its intro), the first list's top-level items (its perks) and
 * whether anything else follows.
 */
export function splitFeature(blocks: RichBlock[]) {
  const first = blocks.findIndex((block) => block.kind === "list");
  const intro = (first === -1 ? blocks : blocks.slice(0, first)).filter(
    (block): block is Extract<RichBlock, { kind: "paragraph" | "heading" }> =>
      block.kind === "paragraph" || block.kind === "heading",
  );
  const list = first === -1 ? null : (blocks[first] as Extract<RichBlock, { kind: "list" }>);
  const perks = list ? list.items.filter((item) => item.depth === 0) : [];
  const more = (first === -1 ? 0 : blocks.length - first - 1) > 0
    || Boolean(list && list.items.length > perks.length);

  return { intro, perks, more };
}
