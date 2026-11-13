/**
 * Paying for an event, and what a registration's status means to the member.
 *
 * A registration for an event that costs money starts as "awaiting_payment" and
 * only counts once the payment is approved, so the app must not tell the member
 * they are "registered" before then. This file is the one place that says which
 * events owe money and how each status is worded.
 */

// Whether registering for this event means owing money. The same rule sets a new
// registration's starting status (see registerForEvent).
export const eventNeedsPayment = (event) =>
  !!event.requiresPayment && (event.registrationFee || 0) > 0;

// Registered, but not in yet: payment owed, under review, or rejected.
export const PENDING_STATUS_LABELS = {
  awaiting_payment: 'Awaiting Payment',
  payment_submitted: 'Payment Under Review',
  rejected: 'Payment Rejected',
};

export const isRegistrationPending = (status) =>
  Object.prototype.hasOwnProperty.call(PENDING_STATUS_LABELS, status);

// What the event sheet says about a registration that exists. Anything that is
// not one of the pending statuses (approved, confirmed, or an older record with
// no status) counts as registered.
export const registrationNotice = (status) => {
  switch (status) {
    case 'awaiting_payment':
      return {
        tone: 'pending',
        text: 'Registration pending: payment needed',
        hint: 'Pay using the details above, then upload your proof of payment under Profile › My Events.',
      };
    case 'payment_submitted':
      return { tone: 'pending', text: 'Registration pending: your payment is being reviewed' };
    case 'rejected':
      return {
        tone: 'rejected',
        text: 'Payment rejected',
        hint: 'Upload a new proof of payment under Profile › My Events.',
      };
    default:
      return { tone: 'done', text: '✓ You are registered for this event' };
  }
};
