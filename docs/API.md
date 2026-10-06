# TailorOS API Reference

## Health & Status Endpoints

### Health Check
```
GET /health
```
Returns system health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### API Version
```
GET /api/version
```
Returns API version and name.

**Response:**
```json
{
  "version": "0.1.0",
  "name": "TailorOS API"
}
```

---

## Versioned API

All application endpoints are available under `/api/v1`. The legacy `/api` prefix remains available for existing local clients.

Success responses use:

```json
{ "success": true, "message": "...", "data": {} }
```

Errors use:

```json
{ "success": false, "message": "...", "errors": [] }
```

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
- `POST /api/v1/users` - Create a shop user
- `PATCH /api/v1/users/:id` - Update a user's profile or status
- `PATCH /api/v1/users/:id/role` - Assign a role when `roles.manage` is granted
- `DELETE /api/v1/users/:id` - Deactivate a user when `users.delete` is granted
- `GET /api/v1/users/roles` - Read the role-permission registry

Authorization is centralized in `backend/src/config/permissions.js` and `backend/src/config/rolePermissions.js`. Routes use permissions such as `customers.view` and `orders.cancel`; clients cannot grant themselves roles or permissions.

### Customers and measurements
- `GET /api/v1/customers` - Search and paginate tenant customers
- `POST /api/v1/customers` - Create a customer profile
- `GET /api/v1/customers/:id` - Read a customer profile
- `PUT /api/v1/customers/:id` - Update profile fields
- `PATCH /api/v1/customers/:id/measurements` - Validate and save a template-backed measurement profile
- `POST /api/v1/customers/:id/measurements` - Create a new immutable measurement profile version
- `GET /api/v1/customers/:id/measurements` - List the customer's measurement history
- `GET /api/v1/customers/:id/measurements/:profileId` - Read one historical profile
- `DELETE /api/v1/customers/:id` - Remove a customer record
- `GET /api/v1/measurements/templates` - List active tenant templates
- `POST /api/v1/measurements/templates` - Create a dynamic measurement template
- `GET /api/v1/measurements/templates/:id` - Read one template
- `PATCH /api/v1/measurements/templates/:id` - Update a template
- `DELETE /api/v1/measurements/templates/:id` - Archive a template

Measurement fields support `number`, `text`, `select`, and `boolean`. Required fields, select options, types, unknown keys, and tenant ownership are validated by the backend. Each profile save increments a customer version. New order items copy the selected profile into an immutable measurement snapshot.

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order status
- `DELETE /api/orders/:id` - Cancel order

### Garments
- `GET /api/garments` - List garment types
- `POST /api/garments` - Create garment type
- `GET /api/garments/:id` - Get garment details
- `PUT /api/garments/:id` - Update garment

### And many more...

Protected endpoints require `Authorization: Bearer <access-token>`.

Tenant-scoped requests derive `shopId` from the authenticated user. `SUPER_ADMIN` may provide an explicit `X-Shop-Id` header to select a shop context; other roles cannot override their tenant context.
