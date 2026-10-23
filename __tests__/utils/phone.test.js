import { normalizePhone, identifierKind } from '../../utils/phone';

describe('normalizePhone', () => {
  it('keeps a plain local number unchanged', () => {
    expect(normalizePhone('0821234567')).toBe('0821234567');
  });

  it('accepts the spacings members actually type', () => {
    expect(normalizePhone('082 123 4567')).toBe('0821234567');
    expect(normalizePhone('082-123-4567')).toBe('0821234567');
    expect(normalizePhone(' 082 123 4567 ')).toBe('0821234567');
    expect(normalizePhone('(082) 123-4567')).toBe('0821234567');
  });

  it('converts international forms to local', () => {
    expect(normalizePhone('+27821234567')).toBe('0821234567');
    expect(normalizePhone('+27 82 123 4567')).toBe('0821234567');
    expect(normalizePhone('27821234567')).toBe('0821234567');
    expect(normalizePhone('0027821234567')).toBe('0821234567');
  });

  it('restores a dropped leading zero', () => {
    expect(normalizePhone('821234567')).toBe('0821234567');
  });

  it('rejects anything that is not a valid SA mobile number', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('12345')).toBeNull();          // too short
    expect(normalizePhone('08212345678')).toBeNull();    // too long
    expect(normalizePhone('member@church.org')).toBeNull();
    expect(normalizePhone('not a number')).toBeNull();
  });

  it('normalizes every phone number currently in the members list', () => {
    // Real stored values at the time phone sign-in was added; each must map to
    // itself so the backfilled phoneNormalized keeps matching.
    ['0626552667', '0719208103', '0788163622', '0818473500', '0832937840']
      .forEach(stored => expect(normalizePhone(stored)).toBe(stored));
  });
});

describe('identifierKind', () => {
  it('treats anything containing @ as an email', () => {
    expect(identifierKind('member@church.org')).toBe('email');
    expect(identifierKind('  member@church.org ')).toBe('email');
  });

  it('treats valid SA mobile numbers as phones', () => {
    expect(identifierKind('0821234567')).toBe('phone');
    expect(identifierKind('+27 82 123 4567')).toBe('phone');
  });

  it('flags empty and unusable input', () => {
    expect(identifierKind('')).toBe('empty');
    expect(identifierKind('   ')).toBe('empty');
    expect(identifierKind('12345')).toBe('unknown');
  });
});
