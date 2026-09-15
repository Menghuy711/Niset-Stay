// Valid booking status transitions, enforced in both the admin and landlord
// update paths so a booking can only move forward: pending -> confirmed or
// cancelled, confirmed -> cancelled, and a cancelled booking is final.
const VALID_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: [],
};

export function validateTransition(currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    const allowedLabel = allowed.length
      ? allowed.map((s) => `'${s}'`).join(', ')
      : 'none (booking is final)';
    throw new Error(
      `Cannot move booking from '${currentStatus}' to '${newStatus}'. ` +
        `Allowed transitions from '${currentStatus}': ${allowedLabel}.`
    );
  }
}