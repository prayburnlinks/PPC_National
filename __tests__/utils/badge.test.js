import { badgeLabel, tabBadge } from '../../utils/badge';

describe('badgeLabel', () => {
  it('writes the number up to nine', () => {
    expect(badgeLabel(1)).toBe('1');
    expect(badgeLabel(9)).toBe('9');
  });

  it('writes 9+ from ten up', () => {
    expect(badgeLabel(10)).toBe('9+');
    expect(badgeLabel(250)).toBe('9+');
  });
});

describe('tabBadge', () => {
  it('is undefined (no badge) when nothing is unread', () => {
    expect(tabBadge(0)).toBeUndefined();
  });

  it('is the label otherwise', () => {
    expect(tabBadge(4)).toBe('4');
    expect(tabBadge(30)).toBe('9+');
  });
});
