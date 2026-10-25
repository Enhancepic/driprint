# DriPrint Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Any path not explicitly matched in `/databases/{database}/documents` is strictly rejected (`allow read, write: if false;`).
2. **Verified Identity & Anti-Spoofing**: All standard write operations require `request.auth != null` and `request.auth.token.email_verified == true`. Any check referencing `request.auth.token.email` (such as bootstrapped admin `mohan.jalan07@gmail.com`) strictly requires `email_verified == true`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates the path ID using `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, length 1..128). `list` operations never call `isValidId`, `get()`, or `exists()`.
4. **Strict Blueprint Schema & Anti-Update-Gap**: Every collection (`admins`, `products`, `designs`, `orders`) validates `create` and `update` writes through a dedicated `isValid[Entity](incoming())` helper enforcing `keys().hasAll(...)`, `keys().hasOnly(...)`, type safety, numeric bounds, regex patterns, and string `.size()` limits verbatim from `firebase-blueprint.json`.
5. **Relational Existence & Ownership**:
   - Creating a `FulfillmentOrder` in `/orders/{orderId}` requires that `/designs/$(incoming().designId)` exists AND is owned by `request.auth.uid`.
   - `ownerId` (on `designs` and `orders`) and `createdBy` (on `products`) must match `request.auth.uid` on creation and are strictly immutable on update (`incoming().ownerId == existing().ownerId`).
6. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on document creation. On update, `createdAt` must equal `existing().createdAt` and `updatedAt` must equal `request.time`.
7. **Terminal State Locking**:
   - Once a `CustomDesign` reaches `status == 'archived'`, non-admin updates are locked.
   - Once a `FulfillmentOrder` reaches `status in ['delivered', 'cancelled']`, non-admin updates are locked.
8. **Secure List Queries**: Every `allow list` rule evaluates `resource.data` directly without delegating filtering to the client and without invoking `get()` or `exists()`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Shadow Field Injection on Design Create)**: Valid `CustomDesign` payload plus unauthorized `"isFeatured": true`. Rejected by `data.keys().hasOnly(...)`.
2. **Payload 2 (Identity Spoofing on Design Create)**: Authenticated user `uid_attacker` submits `ownerId: "uid_victim"` when creating a design. Rejected by `incoming().ownerId == request.auth.uid`.
3. **Payload 3 (Unverified Admin Email Spoof)**: User with `email: "mohan.jalan07@gmail.com"` but `email_verified: false` attempts to create a `CatalogProduct`. Rejected by `isVerifiedUser()`.
4. **Payload 4 (Orphaned Order Creation)**: User attempts to create an order in `/orders/order_1` referencing a non-existent `designId: "non_existent_design"`. Rejected by `exists(/databases/$(database)/documents/designs/$(incoming().designId))`.
5. **Payload 5 (Cross-Tenant Order Creation)**: User `uid_attacker` creates an order referencing a valid `designId` owned by `uid_victim`. Rejected by `get(/databases/$(database)/documents/designs/$(incoming().designId)).data.ownerId == request.auth.uid`.
6. **Payload 6 (Immortal Field Mutation on Design Update)**: Owner attempts to change `ownerId` or `createdAt` during a design update. Rejected by `incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`.
7. **Payload 7 (Terminal State Bypass on Order Update)**: Customer attempts to cancel an order whose current `status` is already `'delivered'`. Rejected by terminal state lock `!(existing().status in ['delivered', 'cancelled'])`.
8. **Payload 8 (Action-Based Update Escalation on Order)**: Non-admin customer attempts to update an order's `status` to `'shipped'` or modify `totalAmount`. Rejected because customer action only permits transitioning `status` from `'pending'` to `'cancelled'`.
9. **Payload 9 (Denial-of-Wallet String Overflow)**: Attacker sends a 5,000-character string in `headlineText` (max 60) or a 500-character `designId`. Rejected by `isValidId()` and `.size() <= 60`.
10. **Payload 10 (Client-Provided Forged Timestamp)**: User submits a past or future timestamp for `createdAt` or `updatedAt` instead of `request.time`. Rejected by `incoming().createdAt == request.time`.
11. **Payload 11 (Unauthorized List Scraping on Orders)**: Authenticated user executes an unconstrained `list` query across `/orders` without filtering `ownerId == request.auth.uid`. Rejected by `resource.data.ownerId == request.auth.uid`.
12. **Payload 12 (Self-Assigned Admin Escalation)**: Non-admin user attempts to write their own document into `/admins/{uid}`. Rejected because only `isBootstrappedAdmin()` can create/modify `/admins/{adminId}`.
