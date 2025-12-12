# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Response Format

All responses follow this structure:

### Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description"
}
```

## Endpoints

### Authentication

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "subscriptionTier": "FREE"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Request Password Reset
```http
POST /auth/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "newpassword123"
}
```

### Users

#### Get Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PATCH /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "bio": "Content creator",
  "profilePictureUrl": "https://..."
}
```

#### Toggle Saved Tool
```http
POST /users/saved-tools
Authorization: Bearer <token>
Content-Type: application/json

{
  "toolId": "tool_uuid"
}
```

#### Record Utility Usage
```http
POST /users/utility-usage
Authorization: Bearer <token>
Content-Type: application/json

{
  "utilitySlug": "titles-hooks-generator"
}
```

#### Create Persona
```http
POST /users/personas
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Professional Writer",
  "description": "Formal, informative tone for business content"
}
```

### Payments

#### Create Checkout Session
```http
POST /stripe/create-checkout-session
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "sessionId": "cs_...",
    "url": "https://checkout.stripe.com/..."
  }
}
```

#### Create Portal Session
```http
POST /stripe/create-portal-session
Authorization: Bearer <token>
```

### Admin

#### List All Users
```http
GET /admin/users
Authorization: Bearer <admin_token>
```

#### Update User (Admin)
```http
PATCH /admin/users/:userId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "ADMIN",
  "subscriptionTier": "PRO"
}
```

#### Delete User (Admin)
```http
DELETE /admin/users/:userId
Authorization: Bearer <admin_token>
```

## Rate Limiting

- **General endpoints**: 100 requests per 15 minutes
- **Auth endpoints**: 5 requests per minute
- **Admin endpoints**: 200 requests per 15 minutes

## Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Webhooks

### Stripe Webhook
```http
POST /stripe/webhook
Stripe-Signature: <signature>
Content-Type: application/json

// Stripe event payload
```

Handled events:
- `checkout.session.completed`
- `customer.subscription.deleted`
- `customer.subscription.updated`