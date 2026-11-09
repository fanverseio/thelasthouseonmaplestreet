import type { DialogueLine } from './types.ts';

/**
 * Classic locket lines (task 4.11). First block: lines from script/act1.md and script/act2-3.md that the Classic
 * catalogue needs and no sequence speaks. Second block: invented filler (placeholder) so every beat has `any`
 * lines and, from beat 4, two lines per band. Invented lines stay inside the Angel's knowledge level (angel-persona.md).
 */
export const LOCKET_SCRIPT_LINES: readonly DialogueLine[] = [
  { id: 'vo_angel_b5_kind_c1', speaker: 'Angel', text: 'That boy is a victim, the same as your neighbor. The smoke chose him because he was kind.' },
  { id: 'vo_angel_b5_neutral_c1', speaker: 'Angel', text: "A voice that does voices. How very theatrical. I'd almost admire it." },
  { id: 'vo_angel_b5_dark_c1', speaker: 'Angel', text: "The smoke picked the softest child on the street to carry its message. Don't waste your anger on the messenger. Find the hand." },
  { id: 'vo_angel_b6_any_c1', speaker: 'Angel', text: 'He moves when you blink. Watch the smoke, not the man.' },
  { id: 'vo_angel_b6_kind_c1', speaker: 'Angel', text: 'Your light is warmer than it was an hour ago. I can feel it through the silver.' },
  { id: 'vo_angel_b6_neutral_c1', speaker: 'Angel', text: "The lane. Children's road. Watch out for the nettles, and the things that aren't nettles." },
  { id: 'vo_angel_b6_dark_c1', speaker: 'Angel', text: 'Doors open faster when you stop knocking politely. Remember that.' },
  { id: 'vo_angel_b7_kind_c1', speaker: 'Angel', text: "A memory, or a lure. Either way, he loves that room. You'll see it again." },
  { id: 'vo_angel_b7_neutral_c1', speaker: 'Angel', text: 'The house is showing you what you want. Houses do that.' },
  { id: 'vo_angel_b7_dark_c1', speaker: 'Angel', text: 'It knows where you live, Elena. Of course it does.' },
  { id: 'vo_angel_b8_kind_c1', speaker: 'Angel', text: 'He blames himself. Children always do. Tell him later it was never his fault.' },
  { id: 'vo_angel_b8_neutral_c1', speaker: 'Angel', text: 'A lock cracked by a child playing with light. How very human.' },
  { id: 'vo_angel_b8_dark_c1', speaker: 'Angel', text: "So the boy broke it. Interesting. Then it could be broken the rest of the way, couldn't it?" },
];

const P = true as const;

export const LOCKET_PLACEHOLDER_LINES: readonly DialogueLine[] = [
  // Hints with no authored line
  { id: 'vo_angel_p2_h2', speaker: 'Angel', text: 'That light at number thirty-one is flickering for a reason, child. Go and look.', placeholder: P },
  { id: 'vo_angel_p4_h1', speaker: 'Angel', text: 'The boy told you where to look, child. Where did he stand?', placeholder: P },
  // Beat 3
  { id: 'vo_angel_b3_c0', speaker: 'Angel', text: 'There is a light at the corner I do not trust, child. Let us go and be disappointed together.', placeholder: P },
  // Beat 5
  { id: 'vo_angel_b5_any_c1', speaker: 'Angel', text: 'The boy said Mr. Briggs kept spare fuses. Hoarders are so useful, in the end.', placeholder: P },
  { id: 'vo_angel_b5_kind_c2', speaker: 'Angel', text: "His guilt is heavier than he is, dear heart. Be gentle with the weight.", placeholder: P },
  { id: 'vo_angel_b5_neutral_c2', speaker: 'Angel', text: 'Fuses. How wonderfully domestic. Even a haunting depends on the wiring.', placeholder: P },
  { id: 'vo_angel_b5_dark_c2', speaker: 'Angel', text: 'A fuse, a Watcher, a gate. Tiresome errands, sweet thing, but they are the quickest way forward.', placeholder: P },
  // Beat 6
  { id: 'vo_angel_b6_kind_c2', speaker: 'Angel', text: 'Breathe, dear heart. The lane is quiet and so, for a moment, are you.', placeholder: P },
  { id: 'vo_angel_b6_neutral_c2', speaker: 'Angel', text: 'A Watcher, a gate and a lane. This street keeps its secrets in a row.', placeholder: P },
  { id: 'vo_angel_b6_dark_c2', speaker: 'Angel', text: 'He guarded the gate and lost. Remember how that felt, sweet thing.', placeholder: P },
  // Beat 7
  { id: 'vo_angel_b7_kind_c2', speaker: 'Angel', text: "That is your own window, dear heart. Hold on to it.", placeholder: P },
  { id: 'vo_angel_b7_neutral_c2', speaker: 'Angel', text: 'Hounds are the smoke\'s idea of a joke. I find it lacks my timing.', placeholder: P },
  { id: 'vo_angel_b7_dark_c2', speaker: 'Angel', text: 'Keep moving, sweet thing. Hounds are a toll, not a wall.', placeholder: P },
  // Beat 8
  { id: 'vo_angel_b8_any_c1', speaker: 'Angel', text: 'A mirror in a carriage house. Rosalind never did anything by halves.', placeholder: P },
  { id: 'vo_angel_b8_kind_c2', speaker: 'Angel', text: 'He was so brave, your boy. Be brave back, dear heart.', placeholder: P },
  { id: 'vo_angel_b8_neutral_c2', speaker: 'Angel', text: 'Three marks in a glass. The reflection knows the way and the room does not. Curious.', placeholder: P },
  { id: 'vo_angel_b8_dark_c2', speaker: 'Angel', text: 'Cast, burn, move on. The mirror is only a lock with better manners.', placeholder: P },
  // Beat 9
  { id: 'vo_angel_b9_kind_c2', speaker: 'Angel', text: "Careful on the stairs, dear heart. I've only just got used to you.", placeholder: P },
  { id: 'vo_angel_b9_neutral_c2', speaker: 'Angel', text: 'Every house has a room it hides. This one has several.', placeholder: P },
  { id: 'vo_angel_b9_dark_c2', speaker: 'Angel', text: 'Cellar stairs, a cat, a board. Rosalind did love a locked door.', placeholder: P },
  // Beat 10
  { id: 'vo_angel_b10_board_c1', speaker: 'Angel', text: 'A table that answers without asking me first. Rosalind did enjoy her little theatrics, child.', placeholder: P },
  { id: 'vo_angel_b10_board_c2', speaker: 'Angel', text: 'The cellar door is open and the dark behind it is only dark. Mostly. Shall we go and be dramatic about it?', placeholder: P },
  { id: 'vo_angel_b10_any_c1', speaker: 'Angel', text: 'Below us the seal waits, child. I have never seen it. I find I am a little nervous.', placeholder: P },
  { id: 'vo_angel_b10_kind_c2', speaker: 'Angel', text: 'Whatever it said, you are more than a key. Remember that, dear heart.', placeholder: P },
  { id: 'vo_angel_b10_neutral_c2', speaker: 'Angel', text: 'Two keys of one blood. Rosalind planned for more than she ever told me.', placeholder: P },
  { id: 'vo_angel_b10_dark_c2', speaker: 'Angel', text: 'Think quickly, sweet thing. Waiting only gives it time.', placeholder: P },
  // Beat 11
  { id: 'vo_angel_b11_any_c1', speaker: 'Angel', text: 'North, east, west. Do them in whatever order frightens you least.', placeholder: P },
  { id: 'vo_angel_b11_kind_c1', speaker: 'Angel', text: 'Three anchors and a mother\'s nerve. Lean on me, dear heart. I weigh nothing.', placeholder: P },
  { id: 'vo_angel_b11_kind_c2', speaker: 'Angel', text: 'Every anchor you restore is a promise to the boy, dear heart. Keep making them.', placeholder: P },
  { id: 'vo_angel_b11_neutral_c1', speaker: 'Angel', text: 'Force, patience, mercy. Rosalind built a seal that argues with itself. I really do like her.', placeholder: P },
  { id: 'vo_angel_b11_neutral_c2', speaker: 'Angel', text: 'Do not hurry the anchors, my curious one. The seal listens to steady hands.', placeholder: P },
  { id: 'vo_angel_b11_dark_c1', speaker: 'Angel', text: 'Smash, hold, purify, and it is done. Do not dawdle, sweet thing.', placeholder: P },
  { id: 'vo_angel_b11_dark_c2', speaker: 'Angel', text: 'The anchors are a toll. Pay it quickly and see what the end offers.', placeholder: P },
  // Beat 12
  { id: 'vo_angel_b12_any_c1', speaker: 'Angel', text: 'Whatever you choose, child, I have enjoyed the company.', placeholder: P },
  { id: 'vo_angel_b12_kind_c2', speaker: 'Angel', text: 'Whichever way it goes, dear heart, I am glad it was you who held the silver.', placeholder: P },
  { id: 'vo_angel_b12_neutral_c2', speaker: 'Angel', text: 'Two paths, my curious one, and no map. How I do love this part.', placeholder: P },
  { id: 'vo_angel_b12_dark_c2', speaker: 'Angel', text: 'Do not let guilt choose for you, sweet thing. Decide.', placeholder: P },
];
