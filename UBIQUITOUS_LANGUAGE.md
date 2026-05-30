# MiniAgent — Ubiquitous Language

> Open this file whenever planning or building a feature.
> Every term in the codebase must match this vocabulary exactly.

---

## Core Domain Terms

| Term | Definition | Code symbol |
|------|-----------|-------------|
| **Request** | A customer's submitted job for one service (e.g. "get me a border pass"). The central aggregate. | `Request`, `RequestId` |
| **Service** | A configurable, data-driven micro-service offering (border pass, insurance, etc.). Never hardcoded. | `Service`, `ServiceId` |
| **Customer** | The end-user who submits a Request and pays. Signs up via WhatsApp number or email. | `User` with `role = customer` |
| **Back-Office Staff** | Processes Requests for their **assigned services only**. Uploads the finished certificate. | `User` with `role = back_office_staff` |
| **Main-Office Staff** | Oversees all Requests, updates status, prints Labels, packs documents. | `User` with `role = main_office_staff` |
| **Delivery Man** | Picks up packed documents, marks IN_TRANSIT, delivers with photo proof. | `User` with `role = delivery_man` |
| **Manager** | Main-office manager with analytics and staff oversight. | `User` with `role = manager` |
| **Super Admin** | System owner — manages services, pricing, users, settings. | `User` with `role = super_admin` |

---

## Request Lifecycle

```
DRAFT → SUBMITTED → AWAITING_PAYMENT → PAID → IN_PROGRESS
  → CERTIFICATE_UPLOADED → READY_FOR_DELIVERY → PICKED_UP
  → IN_TRANSIT → DELIVERED → COMPLETED

Side states: CANCELLED | ON_HOLD | NEEDS_MORE_INFO | REFUNDED

Digital-only shortcut: CERTIFICATE_UPLOADED → COMPLETED
```

| Status | Who sets it | Meaning |
|--------|------------|---------|
| `DRAFT` | System (on create) | Customer started but hasn't submitted |
| `SUBMITTED` | Customer | All required inputs provided |
| `AWAITING_PAYMENT` | System (invoice generated) | Waiting for Phapay confirmation |
| `PAID` | System (webhook) | Payment confirmed |
| `IN_PROGRESS` | Back-office staff | Being processed |
| `CERTIFICATE_UPLOADED` | Back-office staff | Finished document uploaded |
| `READY_FOR_DELIVERY` | Main-office staff | Label printed, document packed |
| `PICKED_UP` | Delivery man (QR scan) | Collected from office |
| `IN_TRANSIT` | Delivery man | En route to customer |
| `DELIVERED` | Delivery man (photo proof) | Handed to customer |
| `COMPLETED` | System | End state |
| `CANCELLED` | Staff or customer | Aborted |
| `ON_HOLD` | Staff | Paused pending action |
| `NEEDS_MORE_INFO` | Staff | Customer must provide more documents |
| `REFUNDED` | Staff | Money returned |

---

## Service Catalog (Seed Data — Never Hardcode)

| Slug | Display name (EN) | Output type |
|------|--------------------|-------------|
| `lao-border-pass` | Lao Border Pass (to Thailand) | `physical_doc` |
| `vehicle-border-pass` | Vehicle Border Pass (to Thailand) | `physical_doc` |
| `diplomat-vehicle-border-pass` | Diplomat Vehicle Border Pass | `physical_doc` |
| `thai-vehicle-insurance` | Thai Vehicle Insurance | `digital_with_qr_label` |
| `register-thai-immigration` | Register Thai Immigration | `digital_pdf` |
| `working-visa` | New Working Visa / Work Permit | `physical_doc` |
| `lao-driving-license-foreigner` | Lao Driving License (Foreigner) | `physical_doc` |
| `extend-driving-license-lao` | Extend Driving License (Lao citizen) | `physical_doc` |
| `passport-photo` | Passport Photo | `printed_photos` |

---

## Pricing & Delivery

| Term | Definition |
|------|-----------|
| **Pricing Option** | A specific price tier for a service (e.g. "Fast — 300,000 LAK / 1-2 days"). Linked to a Service. |
| **Pricing Mode** | How a price is calculated: `flat` / `per_person` / `per_vehicle_type` / `conditional` |
| **SLA Days** | Committed processing days for a pricing option |
| **Delivery Fee** | Distance-based fee calculated from Vientiane center to the customer's GPS coordinates |
| **Delivery Tier** | A band in the fee table: ≤5 km = 50,000 LAK … >20 km = not serviceable |
| **Origin** | Fixed point used for distance calculation — Vientiane center (configurable in `settings`) |
| **Digital-only** | Services where output is a PDF/certificate sent digitally — no delivery |

---

## Documents & Files

| Term | Definition |
|------|-----------|
| **Certificate** | The finished official document produced by back-office staff. Has a `download_token` for a public download URL. |
| **QR Label** | A 100×100 px sticker placed on a physical document. QR links to the public tracking page. |
| **Label (printable)** | The full printable sticker PDF for main-office staff: QR code + request details + customer phone + GPS link. |
| **Proof Photo** | Photo taken by the delivery man on delivery. Stored as a `File` with `kind = proof`. |
| **Download Token** | Unguessable token in the certificate URL. Required to download the document without login. |
| **Public Token** | Unguessable token in the QR — opens the public tracking page for a Request. NOT the sequential request number. |

---

## Auth & Identity

| Term | Definition |
|------|-----------|
| **Access Token** | Short-lived JWT (15 min). Sent in `Authorization: Bearer` header. |
| **Refresh Token** | Long-lived JWT (7 days). Stored securely, used to get a new access token. |
| **OTP** | One-time passcode sent via WhatsApp or email for signup/login verification. |
| **Service Assignment** | Links a `back_office_staff` user to one or more Services — they can only see those requests. |

---

## Integrations

| Term | Definition |
|------|-----------|
| **Phapay** | The payment gateway. Accessed through a `PaymentProvider` interface — never called directly from business logic. |
| **WhatsApp Cloud API** | Used for OTP delivery and outbound notifications. Accessed through `NotificationService`. |
| **Distance API** | Google Distance Matrix or OpenRouteService — calculates road distance for delivery fee. Results are cached. |

---

## Locale Codes

| Code | Language |
|------|----------|
| `lo` | Lao (default) |
| `hmn` | Hmong |
| `en` | English (fallback) |
| `zh` | Chinese |
| `vi` | Vietnamese |
| `th` | Thai |
| `ko` | Korean |

Admin interface only uses: `lo`, `th`, `en`
