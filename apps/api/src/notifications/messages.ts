import { OtpChannel, RequestStatus } from '@mini-agent/types';

type Locale = string;

/** Localized OTP message (Lao default, English fallback). */
export function otpMessage(_channel: OtpChannel, code: string, locale: Locale): string {
  const templates: Record<string, string> = {
    lo: `ລະຫັດຢືນຢັນ MiniAgent ຂອງທ່ານແມ່ນ: ${code}`,
    en: `Your MiniAgent verification code is: ${code}`,
    th: `รหัสยืนยัน MiniAgent ของคุณคือ: ${code}`,
  };
  return templates[locale] ?? templates.en;
}

/**
 * Localized status-change message. Returns null for statuses the customer
 * should not be pinged about (only the key transitions notify).
 */
export function statusMessage(
  status: RequestStatus,
  requestNumber: string,
  locale: Locale,
): string | null {
  const byStatus: Partial<Record<RequestStatus, Record<string, string>>> = {
    [RequestStatus.PAID]: {
      lo: `ໄດ້ຮັບການຊຳລະແລ້ວ ✅ ຄຳຂໍ ${requestNumber} ກຳລັງດຳເນີນການ.`,
      en: `Payment received ✅ Request ${requestNumber} is now being processed.`,
      th: `ได้รับการชำระแล้ว ✅ คำขอ ${requestNumber} กำลังดำเนินการ`,
    },
    [RequestStatus.CERTIFICATE_UPLOADED]: {
      lo: `ເອກະສານຂອງທ່ານພ້ອມແລ້ວ 📄 ຄຳຂໍ ${requestNumber}.`,
      en: `Your document is ready 📄 Request ${requestNumber}.`,
      th: `เอกสารของคุณพร้อมแล้ว 📄 คำขอ ${requestNumber}`,
    },
    [RequestStatus.IN_TRANSIT]: {
      lo: `ກຳລັງຈັດສົ່ງ 🛵 ຄຳຂໍ ${requestNumber} ກຳລັງໄປຫາທ່ານ.`,
      en: `On the way 🛵 Request ${requestNumber} is being delivered to you.`,
      th: `กำลังจัดส่ง 🛵 คำขอ ${requestNumber} กำลังไปหาคุณ`,
    },
    [RequestStatus.DELIVERED]: {
      lo: `ສົ່ງສຳເລັດແລ້ວ 🎉 ຂອບໃຈທີ່ໃຊ້ MiniAgent! ຄຳຂໍ ${requestNumber}.`,
      en: `Delivered 🎉 Thank you for using MiniAgent! Request ${requestNumber}.`,
      th: `จัดส่งสำเร็จ 🎉 ขอบคุณที่ใช้ MiniAgent! คำขอ ${requestNumber}`,
    },
  };

  const template = byStatus[status];
  if (!template) return null;
  return template[locale] ?? template.en;
}
