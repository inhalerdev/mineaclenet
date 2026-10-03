import { Fragment, type ReactNode } from "react";
import type { RichBlock, RichSpan } from "@/features/marketplace/rich-text";
import { Check } from "./bits";
import styles from "./RichText.module.css";

/*
 * A Tebex description (features/marketplace/rich-text.ts) in the site's own
 * style: lead text, headings, paragraphs and lists with the gold check;
 * bold reads brighter, commands (inline code) sit in a small dark slot.
 * Only text is rendered, never HTML from the store.
 */
export function RichSpans({ spans }: { spans: RichSpan[] }) {
  return (
    <>
      {spans.map((span, index) => {
        const lines = span.text.split("\n");
        let node: ReactNode = lines.map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex ? <br /> : null}
            {line}
          </Fragment>
        ));

        if (span.code) {
          node = <code className={styles.code}>{node}</code>;
        }
        if (span.bold) {
          node = <strong className={styles.strong}>{node}</strong>;
        }
        if (span.italic) {
          node = <em>{node}</em>;
        }
        if (span.underline) {
          node = <u>{node}</u>;
        }
        if (span.strike) {
          node = <s>{node}</s>;
        }
        if (span.href) {
          node = (
            <a
              className={styles.link}
              href={span.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {node}
            </a>
          );
        }

        return <Fragment key={index}>{node}</Fragment>;
      })}
    </>
  );
}

export function RichBlocks({ blocks }: { blocks: RichBlock[] }) {
  if (!blocks.length) {
    return null;
  }

  return (
    <div className={styles.rich}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <h3 key={index} className={styles.heading}>
                <RichSpans spans={block.spans} />
              </h3>
            );
          case "paragraph":
            return (
              <p key={index} className={block.lead ? styles.lead : undefined}>
                <RichSpans spans={block.spans} />
              </p>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            let number = 0;

            return (
              <List key={index} className={styles.list}>
                {block.items.map((item, itemIndex) => {
                  number += item.depth === 0 ? 1 : 0;

                  return (
                    <li key={itemIndex} data-depth={item.depth || undefined}>
                      {block.ordered && item.depth === 0 ? (
                        <b className={styles.number} aria-hidden="true">
                          {number}
                        </b>
                      ) : item.depth ? (
                        <i className={styles.dot} aria-hidden="true" />
                      ) : (
                        <Check />
                      )}
                      <span>
                        <RichSpans spans={item.spans} />
                      </span>
                    </li>
                  );
                })}
              </List>
            );
          }
          case "rule":
            return <hr key={index} className={styles.rule} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
