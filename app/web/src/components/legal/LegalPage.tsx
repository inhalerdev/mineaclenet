import { Fragment, type ReactNode } from "react";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import {
  LEGAL_UPDATED,
  SUPPORT_EMAIL,
  legalDocuments,
  type LegalDocument,
} from "@/features/legal/legal-content";
import styles from "./LegalPage.module.css";

/*
 * Terms (/terms), Privacy (/privacy) and Refunds (/refunds): one page each,
 * with tabs to switch between them, a short contents list on wide screens
 * and numbered sections. Text lives in features/legal/legal-content.ts.
 */

/* "{email}" → mailto link, "[Label](href)" → link; the rest is plain text. */
function richText(text: string): ReactNode[] {
  return text.split(/(\{email\}|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
    if (part === "{email}") {
      return (
        <a key={index} href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);

    if (link) {
      const external = /^https?:/.test(link[2]);

      return (
        <a
          key={index}
          href={link[2]}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {link[1]}
        </a>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

const sectionId = (heading: string) =>
  heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function LegalPage({
  viewer,
  topPlayers,
  doc,
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  doc: LegalDocument;
}) {
  return (
    <FramedPage viewer={viewer} topPlayers={topPlayers} currentPath={doc.path} variant="content">
      <div className={content.content}>
        <PageIntro
          tag="Legal"
          tone="purple"
          title={doc.title}
          footer={
            <nav className={`${content.chips} ${styles.tabs}`} aria-label="Legal pages">
              {legalDocuments.map((item) => (
                <a
                  key={item.slug}
                  className={content.chip}
                  href={item.path}
                  aria-current={item.slug === doc.slug ? "page" : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          }
        >
          {doc.intro} Last updated {LEGAL_UPDATED}.
        </PageIntro>

        <div className={styles.layout}>
          <nav className={styles.toc} aria-label="On this page">
            <strong>On this page</strong>
            <ol>
              {doc.sections.map((section) => (
                <li key={section.heading}>
                  <a href={`#${sectionId(section.heading)}`}>{section.heading}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className={styles.doc}>
            {doc.sections.map((section, index) => (
              <section
                key={section.heading}
                id={sectionId(section.heading)}
                className={styles.section}
              >
                <h2>
                  <span className={styles.number}>{index + 1}</span>
                  {section.heading}
                </h2>
                {section.blocks.map((block, blockIndex) =>
                  typeof block === "string" ? (
                    <p key={blockIndex}>{richText(block)}</p>
                  ) : (
                    <ul key={blockIndex}>
                      {block.list.map((item) => (
                        <li key={item}>{richText(item)}</li>
                      ))}
                    </ul>
                  ),
                )}
              </section>
            ))}
          </article>
        </div>
      </div>
    </FramedPage>
  );
}
