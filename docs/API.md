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

## Future Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout
- `POST /auth/password-reset` - Reset password

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

See PHASE_0.md for full module list.
