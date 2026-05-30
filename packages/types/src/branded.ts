// Branded types prevent passing the wrong ID type to a domain function.
// Usage: `const id = 'abc123' as UserId;` or via factory `asUserId('abc123')`

declare const __brand: unique symbol;
type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

export type UserId = Brand<string, 'UserId'>;
export type ServiceId = Brand<string, 'ServiceId'>;
export type RequestId = Brand<string, 'RequestId'>;
export type FileId = Brand<string, 'FileId'>;
export type CertificateId = Brand<string, 'CertificateId'>;
export type LabelId = Brand<string, 'LabelId'>;
export type DeliveryId = Brand<string, 'DeliveryId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type PricingOptionId = Brand<string, 'PricingOptionId'>;
export type PublicToken = Brand<string, 'PublicToken'>;
export type DownloadToken = Brand<string, 'DownloadToken'>;
export type RequestNumber = Brand<string, 'RequestNumber'>;
