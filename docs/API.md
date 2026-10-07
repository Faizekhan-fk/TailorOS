# TailorOS API Reference

## Health & Status Endpoints

### Health Check
```
GET /health
```
Liveness endpoint. Returns HTTP 200 while the process is serving requests.

### Readiness Check
```
GET /ready
```
Returns HTTP 200 only when MongoDB and Redis are ready; otherwise returns HTTP 503 and identifies the unavailable service.

The response includes `status`, `services.database`, `services.redis`, and a timestamp.

---

### API Version
```
GET /api
```
Returns the API name and current version.

**Response:**
```json
{
  "message": "TailorOS API",
  "version": "0.1.0"
}
```

---

## Versioned API

All application endpoints are available under `/api/v1`. The legacy `/api` prefix remains available for existing local clients.

Response fields vary by endpoint; most module routes return `success` and a resource-specific key. Validation and authorization failures return an HTTP error status and a message.

### Authentication
- `POST /api/v1/auth/register` - Create a shop owner account
- `POST /api/v1/auth/login` - Authenticate with email and password
- `POST /api/v1/auth/refresh` - Rotate the HttpOnly refresh token
- `POST /api/v1/auth/logout` - Revoke the refresh token
- `GET /api/v1/auth/me` - Return the current authenticated user
- `PUT /api/v1/auth/profile` - Update the current user's profile
- `POST /api/v1/auth/change-password` - Change password and revoke sessions

### Users and RBAC
- `GET /api/v1/users` - List users within the authenticated shop
- `GET /api/v1/users/:id` - Read a user within the authenticated shop
- `POST /api/v1/users` - Create a shop user
- `PATCH /api/v1/users/:id` - Update a user's profile or status
- `PATCH /api/v1/users/:id/role` - Assign a role when `roles.manage` is granted
- `DELETE /api/v1/users/:id` - Deactivate a user when `users.delete` is granted
- `GET /api/v1/users/roles` - Read the role-permission registry

Authorization is centralized in `backend/src/config/permissions.js` and `backend/src/config/rolePermissions.js`. Routes use permissions such as `customers.view` and `orders.cancel`; clients cannot grant themselves roles or permissions.

### Customers and measurements
- `GET /api/v1/customers?page=1&limit=20&search=...&status=ACTIVE&gender=female&tag=VIP&sortBy=createdAt&sortOrder=desc` - Search, filter, sort, and paginate tenant customers (`limit` is capped at 100)
- `POST /api/v1/customers` - Create a customer profile
- `GET /api/v1/customers/:id` - Read a customer profile
- `PATCH /api/v1/customers/:id` - Update permitted profile fields (`PUT` remains as a compatibility alias)
- `DELETE /api/v1/customers/:id` - Soft-delete (deactivate) a customer; records and history are retained
- `PATCH /api/v1/customers/:id/measurements` - Validate and save a template-backed measurement profile
- `POST /api/v1/customers/:id/measurements` - Create a new immutable measurement profile version
- `GET /api/v1/customers/:id/measurements` - List the customer's measurement history
- `GET /api/v1/customers/:id/measurements/:profileId` - Read one historical profile
- `GET /api/v1/measurements/templates` - List active tenant templates
- `POST /api/v1/measurements/templates` - Create a dynamic measurement template
- `GET /api/v1/measurements/templates/:id` - Read one template
- `PATCH /api/v1/measurements/templates/:id` - Update a template
- `DELETE /api/v1/measurements/templates/:id` - Archive a template

Measurement fields support `number`, `text`, `select`, and `boolean`. Required fields, select options, types, unknown keys, and tenant ownership are validated by the backend. Each profile save increments a customer version. New order items copy the selected profile into an immutable measurement snapshot.

Customer routes require authentication, a tenant context, and the matching `customers.view`, `customers.create`, `customers.update`, or `customers.delete` permission. The backend takes the shop from the authenticated tenant context; submitted `shopId`, `customerNumber`, and audit fields are rejected. Super-admin shop selection follows the existing `X-Shop-Id` tenant middleware rules.

Customer responses preserve the established API shape (`customer` or `customers` at the response root). List responses include `{ page, limit, total, totalPages }`. Customer numbers use an atomic per-shop sequence (`CUS-000001`, ...); gaps can occur if a create attempt fails after allocating a number. Delete is a soft delete: `deletedAt` is set and status becomes `INACTIVE`; normal customer endpoints no longer return that record.

### Customers
The legacy `/api/customers` prefix remains available for compatibility and exposes the same customer routes and behavior as `/api/v1/customers`.

### Orders
- `GET /api/v1/orders` - List tenant orders
- `POST /api/v1/orders` - Create an order and automatically create one queued production job per item
- `GET /api/v1/orders/:id` - Get order details and the payment summary
- `PUT /api/v1/orders/:id` - Update permitted order metadata; delivery is allowed only after every production job is ready. Payment and production progress cannot be written through this endpoint.
- `PATCH /api/v1/orders/:id/cancel` - Cancel an undelivered order and its production jobs (`orders.cancel`)
- `DELETE /api/v1/orders/:id` - Delete an order only if it has no payment history; otherwise cancel it

### Payments
- `GET /api/v1/payments?page=1&limit=20&orderId=...&customerId=...&type=PAYMENT&status=POSTED` - List the current shop's payment/refund ledger (`payments.view`)
- `GET /api/v1/payments/:id` - Read a receipt and its related order/customer (`payments.view`)
- `POST /api/v1/payments` - Record a payment against an order (`payments.create`)
- `PATCH /api/v1/payments/:id` - Update payment reference/notes while posted (`payments.update`)
- `POST /api/v1/payments/:id/refunds` - Record a refund against the original payment (`payments.create`)
- `DELETE /api/v1/payments/:id` - Void an unrefunded payment; the ledger entry is retained (`payments.delete`)

Payment and refund amounts must be positive currency values with at most two decimal places. The server atomically checks order balance, keeps the order's legacy `payment.paidAmount`, `payment.status`, and method summary synchronized, and rejects writes against cancelled orders. Refund records link to the original receipt and reduce the order balance; voids are available only before any refund. Payment history prevents hard deletion of its order. Receipts are available in the Payments UI and can be printed from the receipt page. Reconciliation and external payment-provider processing are not implemented.

### Production
- `GET /api/v1/production?page=1&limit=20&stage=queued&orderId=...&assignedTailor=...` - List shop production jobs (`production.view`)
- `GET /api/v1/production/:id` - Read a shop-scoped job (`production.view`)
- `POST /api/v1/production/orders/:orderId/jobs` - Idempotently generate missing per-item jobs for a legacy order (`production.create`)
- `PATCH /api/v1/production/:id/stage` - Move a job through its allowed workflow stages (`production.update`)
- `PATCH /api/v1/production/:id/assignment` - Assign or unassign an available tailor profile from the current shop (`production.assign`)

Jobs start as `queued` and move through `cutting`, `sewing`, optional `fitting`, `finishing`, `quality_check`, and `ready`; jobs may be blocked and resumed at the stage where they stopped. Invalid transitions return `409`. Advancing jobs updates the order to `in-progress` or `ready`; an order can be marked delivered only after all its jobs are ready. Cancelling an order cancels its jobs. All routes require authentication and tenant context, and cross-shop IDs are not accessible.

Payments and production pages are available at `/payments` and `/production`. Actions are permission-gated in the UI and independently enforced by the API.

### Purchases
- `GET /api/v1/purchases?page=1&limit=20` - List tenant purchase orders (`purchases.view`)
- `POST /api/v1/purchases` - Create a purchase order with supplier and inventory line items (`purchases.create`)
- `GET /api/v1/purchases/:id` - Read a purchase order (`purchases.view`)
- `POST /api/v1/purchases/:id/receive` - Receive a purchase and increase the referenced inventory stock (`purchases.update`)
- `DELETE /api/v1/purchases/:id` - Cancel a purchase that has not been received (`purchases.delete`)

Receipt is guarded against duplicate processing. Receiving uses an intermediate state and attempts stock compensation if the receipt operation fails.

### Expenses
- `GET /api/v1/expenses` - List tenant expenses (`expenses.view`)
- `POST /api/v1/expenses` - Record an expense (`expenses.create`)
- `PATCH /api/v1/expenses/:id` - Update an expense (`expenses.update`)
- `DELETE /api/v1/expenses/:id` - Void an expense while retaining its record (`expenses.delete`)

### Invoices
- `GET /api/v1/invoices` - List issued tenant invoices (`invoices.view`)
- `POST /api/v1/invoices` - Create an invoice snapshot for an order (`invoices.create`)
- `GET /api/v1/invoices/:id` - Read an invoice (`invoices.view`)
- `DELETE /api/v1/invoices/:id` - Void an invoice (`invoices.delete`)

An invoice is unique per shop/order and tracks paid amount and outstanding status as payments/refunds change. Invoices can be printed from the staff UI; email delivery is not implemented.

### Notifications
- `GET /api/v1/notifications` - List shop notifications and the current user's read state (`notifications.view`)
- `PATCH /api/v1/notifications/:id/read` - Mark one notification as read (`notifications.view`)
- `PATCH /api/v1/notifications/read-all` - Mark the current user's notifications as read (`notifications.view`)
- `POST /api/v1/notifications` - Create a shop announcement (`notifications.manage`)

Business events are queued through BullMQ and persisted by the notification worker. Socket.IO emits `notification:new` and `business:event` to the authenticated shop room or recipient user room. Socket authentication uses the access JWT, then reloads the user and role/shop context from MongoDB. A `SUPER_ADMIN` connection must provide a valid active `shopId` in the Socket.IO handshake auth.

### Reports and analytics
- `GET /api/v1/reports/financial?from=...&to=...` - Tenant financial summary including payment, expense, and purchase totals (`reports.view`)
- `GET /api/v1/reports/production?from=...&to=...` - Tenant production summary (`reports.view`)
- `GET /api/v1/analytics/overview` - Cached tenant overview metrics (`analytics.view`)

Report and analytics cache keys are shop-scoped and invalidated after relevant business mutations. Redis is required for readiness and queue processing; report API responses can still be computed when a cache read/write fails according to the service fallback behavior.

### Audit logs
- `GET /api/v1/audit-logs?page=1&limit=50&resource=...&actorId=...&from=...&to=...` - Query tenant write-operation logs (`audit_logs.view`)

The audit middleware records authenticated write method, resource, actor, role, tenant, status, request ID, and route. It intentionally does not persist request bodies. Audit entries are immutable through the model API.

### Customer portal
- `POST /api/v1/customer-portal/auth/login` - Authenticate using `shopId`, customer email, and portal password
- `GET /api/v1/customer-portal/me` - Read the authenticated portal customer's profile
- `GET /api/v1/customer-portal/me/orders` - Read that customer's orders
- `GET /api/v1/customer-portal/me/invoices` - Read that customer's invoices
- `GET /api/v1/customer-portal/me/measurements` - Read that customer's measurements
- `GET /api/v1/customer-portal/accounts` - List shop portal accounts (`customer_portal.view`)
- `POST /api/v1/customer-portal/accounts` - Enable portal access for a shop customer (`customer_portal.manage`)
- `PATCH /api/v1/customer-portal/accounts/:id` - Update/disable a portal account (`customer_portal.manage`)

Portal access tokens use a separate audience and short expiry. Customer record IDs and shop scope are derived from the verified portal account, not request parameters. The customer-facing UI is available at `/portal/login` and `/portal`.

### WhatsApp
- `GET /api/v1/whatsapp/status` - Read provider configuration status without revealing credentials (`whatsapp.view`)
- `GET /api/v1/whatsapp/messages?page=1&limit=25` - List tenant delivery attempts (`whatsapp.view`)
- `POST /api/v1/whatsapp/customers/:customerId/consent` - Record or revoke documented consent (`whatsapp.manage`)
- `POST /api/v1/whatsapp/messages` - Queue an approved order-update template (`whatsapp.send`)
- `GET /api/v1/whatsapp/webhook` - Verify the Meta webhook subscription challenge
- `POST /api/v1/whatsapp/webhook` - Verify `X-Hub-Signature-256` against the raw request bytes and update delivery status

Configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ORDER_UPDATE_TEMPLATE`, and `WHATSAPP_TEMPLATE_LANGUAGE` on the backend only. The Meta template must be approved and contain the exact number/order of body parameters supplied by the user. Recipients must have recorded opt-in; the worker rechecks consent before sending. Provider credentials are never returned to the frontend. The current configuration uses one Cloud API phone number and approved template for the installation.

Delivery is asynchronous through BullMQ. Provider webhook status callbacks update message delivery state. Set the Meta callback URL to `https://<domain>/api/v1/whatsapp/webhook`, subscribe to the `messages` field, and use the same app secret and verification token. Sending is disabled with HTTP 503 until all required configuration is present.

### Barcodes and QR codes
- `GET /api/v1/barcodes/:type/:id?format=qr` - Generate a QR SVG for a tenant customer, order, or inventory item (`barcodes.view`)
- `GET /api/v1/barcodes/:type/:id?format=barcode` - Generate a Code 128 SVG label (`barcodes.view`)
- `POST /api/v1/barcodes/resolve` - Resolve a scanned signed value within the current shop (`barcodes.resolve`)

Codes contain a record type, identifier, and HMAC signature bound to the shop. The API verifies the signature and tenant scope before returning a minimized record summary. Changing the signing secret invalidates previously printed codes. The UI at `/barcodes` supports printable labels, camera scanning where `BarcodeDetector` is available, and USB/Bluetooth scanner input.

### Garments
- `GET /api/garments` - List garment types
- `POST /api/garments` - Create garment type
- `GET /api/garments/:id` - Get garment details
- `PUT /api/garments/:id` - Update garment

### And many more...

Protected endpoints require `Authorization: Bearer <access-token>`.

Tenant-scoped requests derive `shopId` from the authenticated user. `SUPER_ADMIN` may provide an explicit `X-Shop-Id` header to select a shop context; other roles cannot override their tenant context.
