import { BadRequestException } from '@nestjs/common';
import { REQUEST_STATUS_TRANSITIONS, type RequestStatus } from '@mini-agent/types';

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  const allowed = REQUEST_STATUS_TRANSITIONS[from] as readonly RequestStatus[];
  return (allowed as readonly string[]).includes(to);
}

export function assertTransition(from: RequestStatus, to: RequestStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Cannot transition request from ${from} to ${to}`,
    );
  }
}

export function getAllowedTransitions(from: RequestStatus): readonly RequestStatus[] {
  return REQUEST_STATUS_TRANSITIONS[from] as readonly RequestStatus[];
}
