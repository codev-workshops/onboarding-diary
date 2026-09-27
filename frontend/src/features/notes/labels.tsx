import Link from "next/link";
import type { Note } from "@/lib/apiClient";
import { formatDateOnly } from "@/components/ui/labels";
import entryStyles from "@/components/entries/entries.module.css";
import styles from "./notes.module.css";

interface TagListProps {
  tags: readonly string[];
  /** When given, each tag links to the list filtered on that tag (exact match). */
  hrefFor?: (tag: string) => string;
}

/** Read-only chips; used by the note card and the detail view. */
export function TagList({ tags, hrefFor }: TagListProps) {
  if (tags.length === 0) return null;
  return (
    <div className={styles.tagList} data-testid="note-tags">
      {tags.map((tag) =>
        hrefFor ? (
          <Link key={tag} href={hrefFor(tag)} className={`${entryStyles.tag} ${styles.tagLink}`} data-testid={`note-tag-${tag}`}>
            #{tag}
          </Link>
        ) : (
          <span key={tag} className={entryStyles.tag} data-testid={`note-tag-${tag}`}>
            #{tag}
          </span>
        ),
      )}
    </div>
  );
}

const PREVIEW_MAX = 240;

/** Card body used by the /notes list and the recruit Notes tab. */
export function NoteCard({ note }: { note: Note }) {
  const preview = note.content.length > PREVIEW_MAX ? `${note.content.slice(0, PREVIEW_MAX).trimEnd()}…` : note.content;
  return (
    <>
      <div className={entryStyles.itemHead}>
        <span className={entryStyles.itemTitle}>{note.title}</span>
        <span className={entryStyles.itemMeta} style={{ marginTop: 0 }}>
          {formatDateOnly(note.entryDate)}
        </span>
      </div>
      {note.tags.length > 0 && (
        <div className={entryStyles.itemMeta}>
          <TagList tags={note.tags} />
        </div>
      )}
      <p className={entryStyles.itemBody}>{preview}</p>
    </>
  );
}
