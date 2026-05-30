// Matt Pocock style: const objects + derived union types instead of TypeScript enums.
// These values must stay in sync with the Prisma schema enums.

export const UserRole = {
  CUSTOMER: 'customer',
  BACK_OFFICE_STAFF: 'back_office_staff',
  MAIN_OFFICE_STAFF: 'main_office_staff',
  DELIVERY_MAN: 'delivery_man',
  MANAGER: 'manager',
  SUPER_ADMIN: 'super_admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const RequestStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAID: 'PAID',
  IN_PROGRESS: 'IN_PROGRESS',
  CERTIFICATE_UPLOADED: 'CERTIFICATE_UPLOADED',
  READY_FOR_DELIVERY: 'READY_FOR_DELIVERY',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD',
  NEEDS_MORE_INFO: 'NEEDS_MORE_INFO',
  REFUNDED: 'REFUNDED',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

// Terminal states — no further transitions allowed
export const TERMINAL_STATUSES = [
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED,
  RequestStatus.REFUNDED,
] as const satisfies ReadonlyArray<RequestStatus>;

// Allowed transitions for the state machine (source of truth)
export const REQUEST_STATUS_TRANSITIONS = {
  [RequestStatus.DRAFT]: [RequestStatus.SUBMITTED, RequestStatus.CANCELLED],
  [RequestStatus.SUBMITTED]: [RequestStatus.AWAITING_PAYMENT, RequestStatus.CANCELLED],
  [RequestStatus.AWAITING_PAYMENT]: [RequestStatus.PAID, RequestStatus.CANCELLED],
  [RequestStatus.PAID]: [RequestStatus.IN_PROGRESS, RequestStatus.ON_HOLD, RequestStatus.REFUNDED],
  [RequestStatus.IN_PROGRESS]: [
    RequestStatus.CERTIFICATE_UPLOADED,
    RequestStatus.NEEDS_MORE_INFO,
    RequestStatus.ON_HOLD,
  ],
  [RequestStatus.CERTIFICATE_UPLOADED]: [
    RequestStatus.READY_FOR_DELIVERY, // physical
    RequestStatus.COMPLETED, // digital-only
  ],
  [RequestStatus.READY_FOR_DELIVERY]: [RequestStatus.PICKED_UP],
  [RequestStatus.PICKED_UP]: [RequestStatus.IN_TRANSIT],
  [RequestStatus.IN_TRANSIT]: [RequestStatus.DELIVERED],
  [RequestStatus.DELIVERED]: [RequestStatus.COMPLETED],
  [RequestStatus.COMPLETED]: [],
  [RequestStatus.CANCELLED]: [],
  [RequestStatus.ON_HOLD]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
  [RequestStatus.NEEDS_MORE_INFO]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
  [RequestStatus.REFUNDED]: [],
} as const satisfies Record<RequestStatus, ReadonlyArray<RequestStatus>>;

export const DeliveryType = {
  DIGITAL_PDF: 'digital_pdf',
  PHYSICAL: 'physical',
  BOTH: 'both',
} as const;
export type DeliveryType = (typeof DeliveryType)[keyof typeof DeliveryType];

export const OutputType = {
  PHYSICAL_DOC: 'physical_doc',
  DIGITAL_PDF: 'digital_pdf',
  DIGITAL_WITH_QR_LABEL: 'digital_with_qr_label',
  PRINTED_PHOTOS: 'printed_photos',
} as const;
export type OutputType = (typeof OutputType)[keyof typeof OutputType];

export const PricingMode = {
  FLAT: 'flat',
  PER_PERSON: 'per_person',
  PER_VEHICLE_TYPE: 'per_vehicle_type',
  CONDITIONAL: 'conditional',
} as const;
export type PricingMode = (typeof PricingMode)[keyof typeof PricingMode];

export const RequestChannel = {
  WHATSAPP: 'whatsapp',
  WEB: 'web',
  MESSENGER: 'messenger',
} as const;
export type RequestChannel = (typeof RequestChannel)[keyof typeof RequestChannel];

export const OtpChannel = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
} as const;
export type OtpChannel = (typeof OtpChannel)[keyof typeof OtpChannel];

export const FileKind = {
  SCAN: 'scan',
  PHOTO: 'photo',
  CERTIFICATE: 'certificate',
  PROOF: 'proof',
  LABEL: 'label',
  QR_LABEL: 'qr_label',
} as const;
export type FileKind = (typeof FileKind)[keyof typeof FileKind];

export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const WalletTransactionType = {
  TOPUP: 'topup',
  WITHDRAW: 'withdraw',
  SPEND: 'spend',
  REFUND: 'refund',
} as const;
export type WalletTransactionType = (typeof WalletTransactionType)[keyof typeof WalletTransactionType];

export const Currency = {
  LAK: 'LAK',
  USD: 'USD',
  THB: 'THB',
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const SUPPORTED_LOCALES = ['lo', 'hmn', 'en', 'zh', 'vi', 'th', 'ko'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE = 'lo' as const satisfies SupportedLocale;
export const FALLBACK_LOCALE = 'en' as const satisfies SupportedLocale;

export const ADMIN_LOCALES = ['lo', 'th', 'en'] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];
