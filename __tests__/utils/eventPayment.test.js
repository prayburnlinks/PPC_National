import {
  eventNeedsPayment,
  isRegistrationPending,
  registrationNotice,
  PENDING_STATUS_LABELS,
} from '../../utils/eventPayment';

describe('eventNeedsPayment', () => {
  it('is true only for an event that requires payment and has a fee', () => {
    expect(eventNeedsPayment({ requiresPayment: true, registrationFee: 200 })).toBe(true);
  });

  it.each([
    ['no payment flag', { registrationFee: 200 }],
    ['payment flag but no fee', { requiresPayment: true, registrationFee: 0 }],
    ['payment flag with a missing fee', { requiresPayment: true }],
    ['a free event', { requiresPayment: false, registrationFee: 0 }],
  ])('is false for %s', (name, event) => {
    expect(eventNeedsPayment(event)).toBe(false);
  });
});

describe('isRegistrationPending', () => {
  it.each(['awaiting_payment', 'payment_submitted', 'rejected'])('treats %s as not in yet', (status) => {
    expect(isRegistrationPending(status)).toBe(true);
    expect(PENDING_STATUS_LABELS[status]).toBeTruthy();
  });

  it.each(['approved', 'confirmed', 'registered', undefined, null, ''])('treats %p as registered', (status) => {
    expect(isRegistrationPending(status)).toBe(false);
  });
});

describe('registrationNotice', () => {
  it('says payment is needed, and where to upload proof, while awaiting payment', () => {
    expect(registrationNotice('awaiting_payment')).toMatchObject({
      tone: 'pending',
      text: 'Registration pending: payment needed',
      hint: expect.stringContaining('Profile › My Events'),
    });
  });

  it('says the payment is being reviewed once proof is submitted', () => {
    expect(registrationNotice('payment_submitted')).toMatchObject({ tone: 'pending' });
  });

  it('flags a rejected payment', () => {
    expect(registrationNotice('rejected')).toMatchObject({ tone: 'rejected', text: 'Payment rejected' });
  });

  it.each(['approved', 'confirmed', 'registered', undefined])('says registered for %p', (status) => {
    expect(registrationNotice(status)).toEqual({ tone: 'done', text: '✓ You are registered for this event' });
  });
});
