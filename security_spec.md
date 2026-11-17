# Security Specification — FundiLink Kenya (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: Unmatched Firestore paths are strictly denied for all reads and writes.
2. **PII Isolation**: User phone numbers (`mpesaPhone`) and personal emails live exclusively in `/users/{userId}/private/profile`, readable and writable only by `request.auth.uid == userId`. Public `/technicians` listings contain zero personal phone numbers or emails.
3. **Identity Integrity**:
   - Creating a booking requires `customerId == request.auth.uid`, `email_verified == true`, and `status == 'requested'`.
   - Creating a technician profile requires `ownerUid == request.auth.uid` (or `isAdmin()` for platform-verified initial entries).
   - Creating a review requires `authorUid == request.auth.uid` AND a completed booking in `/bookings/{bookingId}` where `customerId == request.auth.uid` and `technicianId == incoming().technicianId`.
4. **Booking State Machine & Terminal Locking**:
   - Transitions allowed only by the assigned technician (`requested -> accepted/cancelled`, `accepted -> en_route/cancelled`, `en_route -> in_progress`, `in_progress -> completed`) or by the customer (`requested/accepted -> cancelled`, or adding `mpesaRef`).
   - Once `status` is `completed` or `cancelled`, all client updates are blocked (except admin override).
5. **Query Enforcer**: `allow list` on `/bookings` enforces `resource.data.customerId == request.auth.uid || resource.data.technicianOwnerUid == request.auth.uid || isAdmin()`.
6. **Temporal & Volumetric Integrity**: `createdAt` and `updatedAt` must equal `request.time`; `createdAt` and ownership fields are immutable after creation; all strings and arrays enforce strict `.size()` and regex bounds.

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unverified Email Write**: Booking create when `request.auth.token.email_verified == false`.
2. **Identity Spoofing on Booking**: Booking create with `customerId: "other-user-uid"`.
3. **Status Shortcutting on Create**: Booking create with `status: "completed"`.
4. **Shadow Ghost Field Injection**: Technician create containing extra field `isPlatformSuperVerified: true`.
5. **Cross-User PII Read**: Authenticated user A reading `/users/user-B/private/profile`.
6. **Blanket Booking List Scraping**: Authenticated user querying `/bookings` without filtering by their `customerId` or `technicianOwnerUid`.
7. **ID Poisoning**: Creating `/technicians/` with a 200-char ID or special characters `../admin`.
8. **Value Poisoning on Update**: Updating `bookings/{id}` with `status: 12345` or a 5,000-char string.
9. **Unauthorized Status Advance**: Customer trying to update booking `status` from `requested` to `completed`.
10. **Terminal State Re-opening**: Technician trying to update a `completed` booking back to `in_progress`.
11. **Orphaned / Fake Review**: User posting a review for a booking ID that does not exist or is still `requested`.
12. **Client Timestamp Forgery**: Creating a technician profile with a backdated `createdAt` not equal to `request.time`.
