import { describe, expect, it } from 'vitest';
import { activeLeads } from './glow-leads.ts';

describe('glow leads (note 6)', () => {
  it('shows the streetlight ring until Seq 2 is done, then drops it', () => {
    expect(activeLeads(['seq1_done'])).toContain('light.street.intersection');
    expect(activeLeads(['seq1_done', 'seq2_done'])).not.toContain('light.street.intersection');
  });

  it('does not lead to the home window any more (it is a real clue with an E prompt)', () => {
    expect(activeLeads([])).not.toContain('light.home.felix_window');
  });
});
