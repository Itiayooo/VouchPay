# VouchPay Backend API

Escrow-as-a-Service for Instagram & WhatsApp vendors.  
Money only moves when the buyer physically confirms delivery via QR scan.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — add your MongoDB URI, Paystack keys, JWT secret

# 3. Seed the database (creates admin + demo vendors + sample transactions)
npm run seed

# 4. Start dev server (hot reload)
npm run dev
# → http://localhost:5000
```

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens) |
| Payments | Paystack API |
| Notifications | Twilio (WhatsApp) |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Winston |

---

## Project Structure

```
src/
├── index.ts                    # Express app + server bootstrap
├── config/
│   └── database.ts             # MongoDB connection
├── middleware/
│   ├── auth.ts                 # JWT verification, role guards
│   └── errorHandler.ts         # Global error + validation handler
├── models/
│   ├── Vendor.ts               # Vendor/auth model (password hashed)
│   └── Transaction.ts          # Escrow transaction model
├── routes/
│   ├── index.ts                # Route aggregator
│   ├── auth.routes.ts          # Register, login, refresh, profile
│   ├── transaction.routes.ts   # Core escrow lifecycle
│   ├── payment.routes.ts       # Paystack webhook + callback
│   └── admin.routes.ts         # Dispute mgmt + platform oversight
├── services/
│   ├── paystack.service.ts     # Paystack API wrapper
│   └── notification.service.ts # WhatsApp notifications (Twilio)
├── types/
│   └── index.ts                # Shared TypeScript types
└── utils/
    ├── helpers.ts              # QR gen, PIN gen, fee calc, reference gen
    ├── logger.ts               # Winston logger
    └── seed.ts                 # Dev database seeder
```

---

## API Reference

Base URL: `http://localhost:5000/api`

All protected routes require:  
`Authorization: Bearer <accessToken>`

---

### Auth  `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Create vendor account |
| POST | `/login` | ❌ | Login, receive tokens |
| POST | `/refresh` | ❌ | Refresh access token |
| GET | `/me` | ✅ | Get current vendor profile |
| PUT | `/profile` | ✅ | Update vendor profile |
| POST | `/logout` | ✅ | Invalidate refresh token |

#### POST `/auth/register`
```json
{
  "name": "Adaeze Okonkwo",
  "businessName": "Ada's Luxury Thrift",
  "email": "ada@example.com",
  "password": "SecurePass123!",
  "phone": "+2348012345678",
  "bankName": "GTBank",
  "accountNumber": "0123456789",
  "accountName": "ADAEZE OKONKWO",
  "instagramHandle": "@adasluxurythrift"
}
```

#### POST `/auth/login`
```json
{ "email": "ada@example.com", "password": "SecurePass123!" }
```
Response:
```json
{
  "success": true,
  "data": {
    "vendor": { "id": "...", "name": "...", "businessName": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

### Transactions  `/api/transactions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ Vendor | Create escrow link |
| GET | `/` | ✅ Vendor | List own transactions (paginated) |
| GET | `/stats` | ✅ Vendor | Vendor stats (earnings, disputes, etc.) |
| GET | `/:id` | ✅ Vendor | Get transaction by ID |
| GET | `/ref/:reference` | ❌ | Get transaction by reference (buyer-facing) |
| POST | `/:id/initialize-payment` | ❌ | Get Paystack payment URL |
| PUT | `/:id/ship` | ✅ Vendor | Mark order as shipped |
| POST | `/:id/verify-qr` | ✅ Vendor | Scan buyer QR → release funds |
| POST | `/:id/verify-pin` | ✅ Vendor | Verify backup PIN → release funds |
| GET | `/:id/qr-image` | ❌ | Get QR code image (base64 PNG) |
| POST | `/:id/dispute` | ❌ | Buyer raises a dispute |
| PUT | `/:id/cancel` | ✅ Vendor | Cancel pending transaction |

#### POST `/transactions` — Create escrow
```json
{
  "itemDescription": "Zara Leather Tote Bag (Brown, Large)",
  "itemAmount": 4500000,
  "deliveryFee": 300000,
  "buyerName": "Chioma Eze",
  "buyerPhone": "+2348098765432",
  "buyerEmail": "chioma@gmail.com",
  "notes": "Ships Monday via GIG Logistics"
}
```
> All amounts in **kobo** (₦45,000 = 4,500,000 kobo)

Response includes `escrowLink` to share with buyer.

#### POST `/:id/verify-qr` — QR Scan (vendor scans buyer's code)
```json
{
  "qrToken": "raw_token_from_buyer_qr",
  "lat": 6.5244,
  "lng": 3.3792
}
```
On success: triggers Paystack transfer to vendor, marks `released`.

#### POST `/:id/verify-pin` — Backup PIN
```json
{ "pin": "2847" }
```

#### POST `/:id/dispute` — Raise dispute (buyer)
```json
{
  "raisedBy": "buyer",
  "reason": "Item not as described",
  "description": "The phone was advertised as new but has scratches on the screen..."
}
```

---

### Payments  `/api/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/webhook` | ❌ (Paystack signed) | Paystack webhook handler |
| GET | `/callback` | ❌ | Redirect after Paystack hosted checkout |
| POST | `/verify` | ❌ | Manual payment verification |

#### Paystack Webhook Flow
1. Buyer pays via Paystack  
2. Paystack POSTs `charge.success` to `/api/payments/webhook`  
3. Backend verifies HMAC signature  
4. Transaction status → `funded`  
5. WhatsApp sent to vendor: *"Safe to ship"*  
6. WhatsApp sent to buyer: *"Here's your QR code + PIN"*

---

### Admin  `/api/admin`

> Requires `role: admin` JWT

| Method | Endpoint | Description |
|---|---|---|
| GET | `/stats` | Platform-wide stats |
| GET | `/transactions` | All transactions (paginated, filterable) |
| GET | `/disputes` | All disputed transactions |
| PUT | `/disputes/:id/review` | Mark dispute under review |
| PUT | `/disputes/:id/resolve` | Resolve dispute (vendor or buyer) |
| GET | `/vendors` | All vendors |
| PUT | `/vendors/:id/verify` | Verify a vendor |
| PUT | `/vendors/:id/suspend` | Suspend a vendor |

#### PUT `/admin/disputes/:id/resolve`
```json
{
  "resolution": "resolved_buyer",
  "mediatorNotes": "Buyer provided photo evidence. Item clearly different from listing."
}
```
- `resolved_vendor` → funds released to vendor via Paystack transfer  
- `resolved_buyer` → refund initiated to buyer

---

## Transaction Status Flow

```
pending_payment
    │
    ▼ (Paystack charge.success)
  funded  ─────────────────────────────────────┐
    │                                           │
    ▼ (vendor marks shipped)               (dispute)
 in_transit                                    │
    │                                           ▼
    ▼ (QR scan or PIN)                      disputed
 delivered                                     │
    │                                   ┌──────┴──────┐
    ▼ (Paystack transfer)               ▼             ▼
 released                         resolved_    resolved_
                                   vendor       buyer
                                      │             │
                                      ▼             ▼
                                   released      refunded
```

---

## Security Design

| Concern | Solution |
|---|---|
| QR brute-force | bcrypt hash stored, 10 attempts max (rate limiter) |
| PIN brute-force | bcrypt hash stored, rate limited to 10/5min |
| Vendor impersonation | JWT + vendor ownership check on every mutation |
| Webhook spoofing | HMAC-SHA512 signature verification |
| Password storage | bcrypt with salt rounds = 12 |
| QR reuse | `qrUsed` flag — one-time only |
| Expired links | MongoDB TTL index on `expiresAt` |
| CORS | Allowlist-based, credentials supported |
| SQL injection | N/A — MongoDB with Mongoose schema validation |

---

## Environment Variables

See `.env.example` for the full list. Key ones:

```env
MONGODB_URI=mongodb://localhost:27017/vouchpay
JWT_SECRET=min_32_char_secret
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
FRONTEND_BASE_URL=http://localhost:5173
```

---

## Seed Accounts

After running `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@vouchpay.ng | Admin1234! |
| Vendor | ada@vouchpay.ng | Vendor1234! |
| Vendor | emeka@vouchpay.ng | Vendor1234! |

---

## Connecting Frontend

In your React frontend, update the API base URL:

```ts
// src/utils/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

Key integration points:
- **Login** → `POST /api/auth/login` → store `accessToken` in memory, `refreshToken` in httpOnly cookie  
- **Create escrow** → `POST /api/transactions` → return `escrowLink` to share  
- **Buyer pays** → `GET /api/transactions/ref/:ref` → `POST /:id/initialize-payment` → redirect to Paystack  
- **Buyer QR** → `GET /api/transactions/:id/qr-image`  
- **Vendor scan** → `POST /api/transactions/:id/verify-qr`  
- **Webhook** → configure in Paystack dashboard → `https://yourdomain.com/api/payments/webhook`
