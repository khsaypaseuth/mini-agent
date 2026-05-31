import { BadRequestException } from '@nestjs/common';
import { RequestStatus } from '@mini-agent/types';
import { assertTransition, canTransition, getAllowedTransitions } from './state-machine';

describe('StateMachine', () => {
  // ─── canTransition ────────────────────────────────────────────────────

  describe('canTransition — valid paths', () => {
    it('DRAFT → SUBMITTED', () => expect(canTransition(RequestStatus.DRAFT, RequestStatus.SUBMITTED)).toBe(true));
    it('DRAFT → CANCELLED', () => expect(canTransition(RequestStatus.DRAFT, RequestStatus.CANCELLED)).toBe(true));
    it('SUBMITTED → AWAITING_PAYMENT', () => expect(canTransition(RequestStatus.SUBMITTED, RequestStatus.AWAITING_PAYMENT)).toBe(true));
    it('AWAITING_PAYMENT → PAID', () => expect(canTransition(RequestStatus.AWAITING_PAYMENT, RequestStatus.PAID)).toBe(true));
    it('PAID → IN_PROGRESS', () => expect(canTransition(RequestStatus.PAID, RequestStatus.IN_PROGRESS)).toBe(true));
    it('IN_PROGRESS → CERTIFICATE_UPLOADED', () => expect(canTransition(RequestStatus.IN_PROGRESS, RequestStatus.CERTIFICATE_UPLOADED)).toBe(true));
    it('CERTIFICATE_UPLOADED → READY_FOR_DELIVERY (physical)', () => expect(canTransition(RequestStatus.CERTIFICATE_UPLOADED, RequestStatus.READY_FOR_DELIVERY)).toBe(true));
    it('CERTIFICATE_UPLOADED → COMPLETED (digital-only)', () => expect(canTransition(RequestStatus.CERTIFICATE_UPLOADED, RequestStatus.COMPLETED)).toBe(true));
    it('READY_FOR_DELIVERY → PICKED_UP', () => expect(canTransition(RequestStatus.READY_FOR_DELIVERY, RequestStatus.PICKED_UP)).toBe(true));
    it('PICKED_UP → IN_TRANSIT', () => expect(canTransition(RequestStatus.PICKED_UP, RequestStatus.IN_TRANSIT)).toBe(true));
    it('IN_TRANSIT → DELIVERED', () => expect(canTransition(RequestStatus.IN_TRANSIT, RequestStatus.DELIVERED)).toBe(true));
    it('DELIVERED → COMPLETED', () => expect(canTransition(RequestStatus.DELIVERED, RequestStatus.COMPLETED)).toBe(true));
    it('ON_HOLD → IN_PROGRESS (resume)', () => expect(canTransition(RequestStatus.ON_HOLD, RequestStatus.IN_PROGRESS)).toBe(true));
    it('NEEDS_MORE_INFO → IN_PROGRESS (re-process)', () => expect(canTransition(RequestStatus.NEEDS_MORE_INFO, RequestStatus.IN_PROGRESS)).toBe(true));
  });

  describe('canTransition — invalid paths', () => {
    it('DRAFT → PAID (skipping steps)', () => expect(canTransition(RequestStatus.DRAFT, RequestStatus.PAID)).toBe(false));
    it('DRAFT → COMPLETED (skipping all)', () => expect(canTransition(RequestStatus.DRAFT, RequestStatus.COMPLETED)).toBe(false));
    it('SUBMITTED → PICKED_UP (out of order)', () => expect(canTransition(RequestStatus.SUBMITTED, RequestStatus.PICKED_UP)).toBe(false));
    it('IN_PROGRESS → SUBMITTED (backwards)', () => expect(canTransition(RequestStatus.IN_PROGRESS, RequestStatus.SUBMITTED)).toBe(false));
    it('DELIVERED → IN_PROGRESS (backwards)', () => expect(canTransition(RequestStatus.DELIVERED, RequestStatus.IN_PROGRESS)).toBe(false));
  });

  describe('canTransition — terminal states', () => {
    it('COMPLETED → anything is false', () => {
      const allStatuses = Object.values(RequestStatus);
      allStatuses.forEach((s) => {
        expect(canTransition(RequestStatus.COMPLETED, s)).toBe(false);
      });
    });

    it('CANCELLED → anything is false', () => {
      const allStatuses = Object.values(RequestStatus);
      allStatuses.forEach((s) => {
        expect(canTransition(RequestStatus.CANCELLED, s)).toBe(false);
      });
    });

    it('REFUNDED → anything is false', () => {
      const allStatuses = Object.values(RequestStatus);
      allStatuses.forEach((s) => {
        expect(canTransition(RequestStatus.REFUNDED, s)).toBe(false);
      });
    });
  });

  // ─── assertTransition ─────────────────────────────────────────────────

  describe('assertTransition', () => {
    it('does not throw for valid transition', () => {
      expect(() => assertTransition(RequestStatus.DRAFT, RequestStatus.SUBMITTED)).not.toThrow();
    });

    it('throws BadRequestException for invalid transition', () => {
      expect(() => assertTransition(RequestStatus.DRAFT, RequestStatus.PAID)).toThrow(BadRequestException);
    });

    it('throws with a descriptive message', () => {
      try {
        assertTransition(RequestStatus.COMPLETED, RequestStatus.IN_PROGRESS);
      } catch (e) {
        expect((e as BadRequestException).message).toContain('COMPLETED');
        expect((e as BadRequestException).message).toContain('IN_PROGRESS');
      }
    });
  });

  // ─── getAllowedTransitions ────────────────────────────────────────────

  describe('getAllowedTransitions', () => {
    it('returns allowed next statuses for a given status', () => {
      const allowed = getAllowedTransitions(RequestStatus.DRAFT);
      expect(allowed).toContain(RequestStatus.SUBMITTED);
      expect(allowed).toContain(RequestStatus.CANCELLED);
    });

    it('returns empty array for terminal states', () => {
      expect(getAllowedTransitions(RequestStatus.COMPLETED)).toHaveLength(0);
      expect(getAllowedTransitions(RequestStatus.CANCELLED)).toHaveLength(0);
    });
  });
});
