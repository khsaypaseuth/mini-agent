import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

/** Default size for the certificate QR label (100×100 px per spec). */
const CERT_LABEL_SIZE = 100;

@Injectable()
export class QrService {
  /** Generate a QR code as a base64 PNG data URL (for inline <img>). */
  async toDataUrl(text: string, size = 256): Promise<string> {
    return QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M' });
  }

  /** Generate a QR code as a raw PNG buffer (for storage). */
  async toPngBuffer(text: string, size = 256): Promise<Buffer> {
    return QRCode.toBuffer(text, { width: size, margin: 1, errorCorrectionLevel: 'M' });
  }

  /** 100×100 px certificate QR label per the spec. */
  async certLabelDataUrl(text: string): Promise<string> {
    return this.toDataUrl(text, CERT_LABEL_SIZE);
  }
}
