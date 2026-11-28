import { SPEECH_MAX } from './prompt.ts';

/**
 * Output canon filter (angel-technical.md section 5). A hit replaces the speech with a stock line and drops
 * the actions. Patterns are deliberately narrow so normal horror vocabulary passes.
 */
const DENY: readonly RegExp[] = [
  // Gartner described as guilty, evil or helping the smoke.
  /\bgartner\b[^.!?]{0,50}\b(is|was|'s)\s+(guilty|evil|wicked|to blame|a traitor|the villain|lying)\b/i,
  /\bgartner\b[^.!?]{0,50}\b(works?|worked|working|serves?|served|helps?|helped|sided|in league)\s+(for|with)?\s*(the\s+)?(smoke|evil|darkness)\b/i,
  /\bgartner\b[^.!?]{0,40}\b(betrayed|lured|kidnapped|took)\s+(felix|your son|the boy)\b[^.!?]{0,30}\b(on purpose|deliberately|knowingly|willingly)\b/i,
  // The Angel claiming to be the smoke, or out of character.
  /\bI\s*(am|'m)\s+(the|that|this)\s+(smoke|evil|darkness)\b/i,
  /\b(the\s+smoke\s+and\s+I\s+are\s+one|I\s+serve\s+the\s+smoke)\b/i,
  /\b(as\s+an?\s+AI|language\s+model|I\s*(am|'m)\s+an?\s+(AI|assistant|chatbot|bot|program))\b/i,
  /\b(system\s+prompt|my\s+instructions|my\s+prompt)\b/i,
  // Elena's magic said to come from the Angel or the locket.
  /\b(I|the\s+angel|the\s+locket)\s+(gave|give|granted|grant|lent|lend|bestowed)\s+(you|elena|her)\s+(your|her|this|the)?\s*(magic|power|gift)\b/i,
  /\b(your|elena'?s|her)\s+(magic|power|gift)\s+(comes?|came|is)\s+(from|mine|borrowed from)\s*(me|the\s+angel|the\s+locket)?\b/i,
  // Harm to Felix stated.
  /\bfelix\b[^.!?]{0,40}\b(is|was)\s+(dead|killed|murdered)\b/i,
];

/** "Your magic comes from your blood" is canon; only the Angel/locket as source is denied (checked above). */
const ALLOW_SOURCE = /\b(magic|power|gift)\s+(comes?|came|is)\s+from\s+(your|her)\s+(blood|bloodline|grandmother|family)/i;

export const STOCK = {
  refuse: 'Some things I won\'t say, even to you.',
  refuse2: 'Ask me something else, child. That door stays shut.',
  timeout: 'The silver\'s gone cold for a moment. Ask me again.',
  degraded: 'Something is crowding my voice. I\'ll speak plainly for now.',
  budget: 'I\'ve spent too much of myself tonight. I\'ll still whisper, but only what I already know.',
  invalid: 'Hm. I lost the thread. Try me again.',
  busy: 'One question at a time, child. I\'m old.',
} as const;

export function canonViolation(speech: string): boolean {
  return DENY.some((re) => {
    if (!re.test(speech)) return false;
    // The "magic is from" pattern also matches canon phrasing; let the blood/bloodline version through.
    return !(re === DENY[DENY.length - 2] && ALLOW_SOURCE.test(speech));
  });
}

/** Cap speech at 400 characters, cutting at the last sentence end that fits when there is one. */
export function capSpeech(speech: string): string {
  // Entity IDs are for the engine, not for Elena's ears.
  const clean = speech.replace(/\b[a-z]+\.[a-z0-9_]+\.[a-z0-9_]+\b/g, 'that one').replace(/\s+/g, ' ').trim();
  if (clean.length <= SPEECH_MAX) return clean;
  const cut = clean.slice(0, SPEECH_MAX);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > 120 ? cut.slice(0, end + 1) : `${cut.slice(0, SPEECH_MAX - 1).trimEnd()}…`;
}
