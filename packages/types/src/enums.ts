export enum UserRole {
  CUSTOMER = 'customer',
  BACK_OFFICE_STAFF = 'back_office_staff',
  MAIN_OFFICE_STAFF = 'main_office_staff',
  DELIVERY_MAN = 'delivery_man',
  MANAGER = 'manager',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum RequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAID = 'PAID',
  IN_PROGRESS = 'IN_PROGRESS',
  CERTIFICATE_UPLOADED = 'CERTIFICATE_UPLOADED',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
  NEEDS_MORE_INFO = 'NEEDS_MORE_INFO',
  REFUNDED = 'REFUNDED',
}

export enum DeliveryType {
  DIGITAL_PDF = 'digital_pdf',
  PHYSICAL = 'physical',
  BOTH = 'both',
}

export enum OutputType {
  PHYSICAL_DOC = 'physical_doc',
  DIGITAL_PDF = 'digital_pdf',
  DIGITAL_WITH_QR_LABEL = 'digital_with_qr_label',
  PRINTED_PHOTOS = 'printed_photos',
}

export enum PricingMode {
  FLAT = 'flat',
  PER_PERSON = 'per_person',
  PER_VEHICLE_TYPE = 'per_vehicle_type',
  CONDITIONAL = 'conditional',
}

export enum RequestChannel {
  WHATSAPP = 'whatsapp',
  WEB = 'web',
  MESSENGER = 'messenger',
}

export enum OtpChannel {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
}

export enum FileKind {
  SCAN = 'scan',
  PHOTO = 'photo',
  CERTIFICATE = 'certificate',
  PROOF = 'proof',
  LABEL = 'label',
  QR_LABEL = 'qr_label',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum WalletTransactionType {
  TOPUP = 'topup',
  WITHDRAW = 'withdraw',
  SPEND = 'spend',
  REFUND = 'refund',
}

export enum Currency {
  LAK = 'LAK',
  USD = 'USD',
  THB = 'THB',
}

export const SUPPORTED_LOCALES = ['lo', 'hmn', 'en', 'zh', 'vi', 'th', 'ko'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'lo';
export const FALLBACK_LOCALE: SupportedLocale = 'en';

export const ADMIN_LOCALES = ['lo', 'th', 'en'] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];
