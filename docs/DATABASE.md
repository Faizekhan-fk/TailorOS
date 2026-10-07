# Database Notes

## Customers

Customer documents are stored in the `customers` collection and scoped to a required `shopId`. The application derives this scope from the authenticated user through the Phase 4 tenant middleware. Customer input cannot set `shopId`, `customerNumber`, `createdBy`, or `updatedBy`.

Customer records contain:

- Identity and contact: `customerNumber`, `name`, `firstName`, `lastName`, `phone`, `whatsapp`, `email`, `gender`
- Profile: `address`, `notes`, `tags`, `status`
- Tenant and audit: `shopId`, `createdBy`, `updatedBy`, Mongoose timestamps
- Retention: `deletedAt`, which is `null` for active records and set on soft deletion
- Existing measurement relationship fields: `measurementTemplateId`, `currentMeasurementProfileId`, and the current `measurements` map

Customer deletion is non-destructive. The API sets `deletedAt` and changes status to `INACTIVE`; list, detail, update, and delete queries exclude soft-deleted records. Associated historical documents remain available to future modules.

### Customer number sequence

`customercounters` contains one sequence document per shop. Its unique `shopId` index protects sequence ownership and an atomic increment assigns numbers in the form `CUS-000001`. The `customers` collection has a unique compound index on `{ shopId, customerNumber }` as the final uniqueness guard. Allocation gaps after failed creates are expected; numbers are not reused.

### Indexes

| Collection | Index | Purpose |
| --- | --- | --- |
| `customers` | `{ shopId: 1, customerNumber: 1 }` unique | Per-shop customer number uniqueness and lookup |
| `customers` | `{ shopId: 1, phone: 1 }` | Tenant phone lookup |
| `customers` | `{ shopId: 1, email: 1 }` | Tenant email lookup |
| `customers` | `{ shopId: 1, whatsapp: 1 }` | Tenant WhatsApp lookup |
| `customers` | `{ shopId: 1, status: 1, createdAt: -1 }` | Status filtering and newest-first listing |
| `customers` | `{ shopId: 1, deletedAt: 1, createdAt: -1 }` | Exclude deleted records and newest-first listing |
| `customercounters` | `{ shopId: 1 }` unique | Atomic per-shop sequence |

MongoDB may build model indexes automatically when the backend connects. For an existing production database, review index-build impact and ensure the compound unique index contains no duplicate data before deploying.

## Phase 15–25 collections

The following business collections are tenant-scoped. Controllers derive `shopId` from authenticated server-side context; clients cannot select another shop by submitting a different tenant ID. Queries for staff features use both the document ID and tenant scope.

| Collection | Purpose |
| --- | --- |
| `purchases` | Supplier purchase orders with inventory line snapshots, quantities, costs, and receiving/cancellation state |
| `expenses` | Shop expenses with category, amount, payment method, date, and void state |
| `invoices` | Issued order snapshots, unique per shop/order, with paid amount and balance status synchronized to the payment ledger |
| `notifications` | Shop or user-targeted in-app notifications, with per-user read state |
| `auditlogs` | Append-only records of authenticated write requests; request bodies are deliberately excluded |
| `customerportalaccounts` | Customer portal credentials and active state, linked to a customer and shop |
| `whatsappmessages` | Tenant-scoped template delivery attempts; recipient phone is stored only in masked form and provider ID supports signed status callbacks |

Purchase receiving prevents repeat stock increments by transitioning through a receiving state before finalizing the purchase. Invoice records preserve their order snapshot instead of relying on mutable order details. Payment and refund services update invoice balances when an invoice exists.

Audit records are immutable through normal Mongoose update/delete operations. Test cleanup uses the collection API because model-level mutation is intentionally rejected. Portal passwords use the existing bcrypt-based password hashing dependency; portal tokens have their own JWT audience and do not grant staff API access.

Customers store WhatsApp opt-in state, timestamp, and staff-recorded source separately from contact data; sending requires explicit opt-in and worker-side revalidation. Outbound parameters are not copied into the delivery log.

QR/barcode payloads are signed with a server-only HMAC key and bind resource IDs to the originating shop. No separate barcode collection is required; resolution verifies the signature then queries the tenant's business collection.

Redis stores short-lived report/analytics cache entries using tenant-keyed namespaces. BullMQ queues store retryable work until workers persist notifications or send WhatsApp template updates. Queue state and cache state are operational data, not substitutes for MongoDB business records.
