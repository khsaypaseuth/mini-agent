/**
 * Thin WhatsApp abstraction so the Cloud API is swappable and testable.
 * Implementations: WhatsAppCloudProvider (real), MockWhatsAppProvider (dev/test).
 */
export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');

export interface WhatsAppProvider {
  /** Send a plain text message to a phone number (E.164, no +). */
  sendText(to: string, body: string): Promise<void>;
}
