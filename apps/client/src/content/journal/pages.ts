/**
 * Rosalind's journal pages. Reading one opens a page in the game (author: a page, not a video).
 * The page text is the voice line's text, so the words on paper and the voice never drift apart.
 */
import type { VoiceLineId } from '../dialogue/types.ts';

export type JournalPageId = 'journal_1' | 'journal_2' | 'journal_3' | 'journal_4' | 'journal_5';

export interface JournalPage {
  id: JournalPageId;
  /** Small heading over the handwriting. */
  title: string;
  /** Rosalind reads it aloud; its text is what the page shows. */
  line: VoiceLineId;
}

export const JOURNAL_PAGES: Record<JournalPageId, JournalPage> = {
  journal_1: { id: 'journal_1', title: 'A note in the drawer', line: 'vo_rosalind_j1' },
  journal_2: { id: 'journal_2', title: "Rosalind's journal", line: 'vo_rosalind_j2' },
  journal_3: { id: 'journal_3', title: "Rosalind's journal", line: 'vo_rosalind_j3' },
  journal_4: { id: 'journal_4', title: "Rosalind's journal", line: 'vo_rosalind_j4' },
  journal_5: { id: 'journal_5', title: "Rosalind's journal", line: 'vo_rosalind_j5' },
};
