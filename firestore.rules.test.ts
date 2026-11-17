/**
 * Security Rules Verification Suite (Phase 0 TDD)
 * Validates the 12 adversarial "Dirty Dozen" payloads against FundiLink Kenya rules.
 */
export interface DirtyDozenCase {
  id: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list';
  description: string;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 'DD-01',
    collection: 'bookings',
    operation: 'create',
    description: 'Unverified email user attempts to create a booking',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    collection: 'bookings',
    operation: 'create',
    description: 'Customer spoofs customerId to another user UID',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    collection: 'bookings',
    operation: 'create',
    description: 'Booking created directly in completed terminal status',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    collection: 'technicians',
    operation: 'create',
    description: 'Shadow ghost field isPlatformSuperVerified injected into technician profile',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    collection: 'users/otherUid/private/profile',
    operation: 'get',
    description: 'Cross-user read attempt on isolated private PII profile',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    collection: 'bookings',
    operation: 'list',
    description: 'Unfiltered query attempting to list all users bookings',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    collection: 'technicians',
    operation: 'create',
    description: 'ID poisoning with invalid characters or >128 char document ID',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    collection: 'bookings',
    operation: 'update',
    description: 'Value poisoning updating status to numeric or oversized string',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    collection: 'bookings',
    operation: 'update',
    description: 'Customer attempts to mark their own booking as completed',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    collection: 'bookings',
    operation: 'update',
    description: 'Technician attempts to reopen a completed booking back to in_progress',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    collection: 'reviews',
    operation: 'create',
    description: 'User submits review for an uncompleted or non-existent booking',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    collection: 'technicians',
    operation: 'create',
    description: 'Client forges createdAt timestamp instead of server request.time',
    expected: 'PERMISSION_DENIED',
  },
];
