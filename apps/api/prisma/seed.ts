import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Service definitions ───────────────────────────────────────────────────

const SERVICES = [
  {
    slug: 'lao-border-pass',
    name: { lo: 'ໃບຜ່ານແດນລາວ (ໄປໄທ)', en: 'Lao Border Pass (to Thailand)', th: 'บัตรผ่านแดนลาว (ไปไทย)' },
    description: { lo: 'ທຳໃບຜ່ານແດນສຳລັບພົນລະເມືອງລາວທີ່ຕ້ອງການເດີນທາງໄປປະເທດໄທ', en: 'Border pass for Lao citizens travelling to Thailand' },
    icon: '🛂',
    outputType: 'physical_doc',
    sortOrder: 1,
    inputs: [
      { key: 'passport_photo', label: { lo: 'ຮູບຖ່າຍ 3×4 ×2 (ພື້ນຫຼັງຂາວ)', en: 'Passport photo 3×4 ×2 (white background)' }, inputType: 'photo', required: true, sortOrder: 1 },
      { key: 'id_or_family_book', label: { lo: 'ສຳເນົາບັດ ຫຼື ສຳມະໂນຄົວ', en: 'Scan of national ID or family book' }, inputType: 'scan', required: true, sortOrder: 2 },
    ],
    pricing: [
      { label: { lo: 'ດ່ວນ (1–2 ວັນ)', en: 'Fast (1–2 days)', th: 'ด่วน (1–2 วัน)' }, amount: 300000, currency: 'LAK', slaDays: 2, pricingMode: 'flat' },
      { label: { lo: 'ທຳມະດາ (3–5 ວັນ)', en: 'Normal (3–5 days)', th: 'ปกติ (3–5 วัน)' }, amount: 200000, currency: 'LAK', slaDays: 5, pricingMode: 'flat' },
    ],
    delivery: ['physical'],
  },
  {
    slug: 'vehicle-border-pass',
    name: { lo: 'ໃບຜ່ານແດນລົດ (ໄປໄທ)', en: 'Vehicle Border Pass (to Thailand)', th: 'บัตรผ่านแดนรถ (ไปไทย)' },
    description: { lo: 'ທຳໃບຜ່ານແດນສຳລັບລົດທີ່ຕ້ອງການເດີນທາງໄປປະເທດໄທ', en: 'Border pass book for vehicles travelling to Thailand' },
    icon: '🚗',
    outputType: 'physical_doc',
    sortOrder: 2,
    inputs: [
      { key: 'vehicle_license', label: { lo: 'ສຳເນົາໃບທະບຽນລົດ', en: 'Scan of vehicle license' }, inputType: 'scan', required: true, sortOrder: 1 },
      { key: 'vehicle_yellow_book', label: { lo: 'ສຳເນົາສະມຸດເຫຼືອງ', en: 'Scan of vehicle yellow book' }, inputType: 'scan', required: true, sortOrder: 2 },
    ],
    pricing: [
      { label: { lo: 'ດ່ວນ (1–2 ວັນ)', en: 'Fast (1–2 days)' }, amount: 300000, currency: 'LAK', slaDays: 2, pricingMode: 'flat' },
      { label: { lo: 'ທຳມະດາ (3–5 ວັນ)', en: 'Normal (3–5 days)' }, amount: 200000, currency: 'LAK', slaDays: 5, pricingMode: 'flat' },
    ],
    delivery: ['physical'],
  },
  {
    slug: 'diplomat-vehicle-border-pass',
    name: { lo: 'ໃບຜ່ານແດນລົດນັກການທູດ (ໄປໄທ)', en: 'Diplomat Vehicle Border Pass (to Thailand)', th: 'บัตรผ่านแดนรถนักการทูต (ไปไทย)' },
    description: { lo: 'ທຳໃບຜ່ານແດນສຳລັບລົດນັກການທູດ', en: 'Border pass for diplomat vehicles travelling to Thailand' },
    icon: '🏛️',
    outputType: 'physical_doc',
    sortOrder: 3,
    inputs: [
      { key: 'vehicle_license', label: { lo: 'ສຳເນົາໃບທະບຽນລົດ', en: 'Scan of vehicle license' }, inputType: 'scan', required: true, sortOrder: 1 },
      { key: 'vehicle_yellow_book', label: { lo: 'ສຳເນົາສະມຸດເຫຼືອງ', en: 'Scan of vehicle yellow book' }, inputType: 'scan', required: true, sortOrder: 2 },
      { key: 'diplomat_id', label: { lo: 'ໃບຢັ້ງຢືນນັກການທູດ', en: 'Diplomat identification document' }, inputType: 'scan', required: true, sortOrder: 3 },
    ],
    pricing: [
      { label: { lo: 'ດ່ວນ', en: 'Fast' }, amount: 300000, currency: 'LAK', slaDays: 2, pricingMode: 'flat' },
      { label: { lo: 'ທຳມະດາ', en: 'Normal' }, amount: 200000, currency: 'LAK', slaDays: 5, pricingMode: 'flat' },
    ],
    delivery: ['physical'],
  },
  {
    slug: 'thai-vehicle-insurance',
    name: { lo: 'ປະກັນໄພລົດໄທ', en: 'Thai Vehicle Insurance', th: 'ประกันภัยรถไทย' },
    description: { lo: 'ທຳປະກັນໄພລົດໄທ ພ້ອມໃບຢັ້ງຢືນດິຈິຕອນ ແລະ QR Label', en: 'Thai vehicle insurance with digital certificate and QR label' },
    icon: '🛡️',
    outputType: 'digital_with_qr_label',
    sortOrder: 4,
    inputs: [
      { key: 'vehicle_license', label: { lo: 'ສຳເນົາໃບທະບຽນລົດ', en: 'Scan of vehicle license' }, inputType: 'scan', required: true, sortOrder: 1 },
      { key: 'vehicle_yellow_book', label: { lo: 'ສຳເນົາສະມຸດເຫຼືອງ', en: 'Scan of vehicle yellow book' }, inputType: 'scan', required: true, sortOrder: 2 },
      { key: 'vehicle_type', label: { lo: 'ປະເພດລົດ', en: 'Vehicle type' }, inputType: 'select', required: true, sortOrder: 3, options: ['motorcycle', 'sedan', 'suv', 'pickup', 'van', 'truck'] },
    ],
    pricing: [
      { label: { lo: 'ລາຄາຕາມປະເພດລົດ', en: 'Price by vehicle type' }, amount: 0, currency: 'USD', slaDays: 3, pricingMode: 'per_vehicle_type', conditions: { note: 'Contact office for exact price by vehicle type' } },
    ],
    delivery: ['digital_pdf', 'physical'],
  },
  {
    slug: 'register-thai-immigration',
    name: { lo: 'ລົງທະບຽນໄອເອັມໄທ', en: 'Register Thai Immigration', th: 'ลงทะเบียน TM30/Immigration ไทย' },
    description: { lo: 'ລົງທະບຽນຂໍ້ມູນການເດີນທາງເຂົ້າປະເທດໄທ', en: 'Register travel information with Thai immigration authorities' },
    icon: '📋',
    outputType: 'digital_pdf',
    sortOrder: 5,
    inputs: [
      { key: 'passport_scan', label: { lo: 'ສຳເນົາໜັງສືຜ່ານແດນ', en: 'Passport scan' }, inputType: 'scan', required: true, sortOrder: 1 },
      { key: 'date_in', label: { lo: 'ວັນທີເດີນທາງໄປ', en: 'Date of travel (departure)' }, inputType: 'date', required: true, sortOrder: 2 },
      { key: 'date_out', label: { lo: 'ວັນທີກັບຄືນ', en: 'Date of return' }, inputType: 'date', required: true, sortOrder: 3 },
      { key: 'checkpoint', label: { lo: 'ດ່ານທີ່ຈະເຂົ້າ', en: 'Entry checkpoint' }, inputType: 'select', required: true, sortOrder: 4, options: ['nongkhai', 'mukdahan', 'savannakhet', 'other'] },
      { key: 'vehicle_or_flight', label: { lo: 'ໃຊ້ລົດຄັນໃດ ຫຼື ໄປທ່ຽວບິນໃດ', en: 'Vehicle plate or flight number' }, inputType: 'text', required: true, sortOrder: 5 },
      { key: 'stay_location', label: { lo: 'ທີ່ຢູ່ຢູ່ໄທ (ຖ້ານອນຄ້າງ)', en: 'Where staying in Thailand (if overnight)' }, inputType: 'text', required: false, sortOrder: 6 },
    ],
    pricing: [
      { label: { lo: '20,000 ກີບ/ຄົນ', en: '20,000 LAK per person' }, amount: 20000, currency: 'LAK', slaDays: 1, pricingMode: 'per_person' },
    ],
    delivery: ['digital_pdf'],
  },
  {
    slug: 'working-visa',
    name: { lo: 'ວີຊ່າເຮັດວຽກ / ໃບຢັ້ງຢືນການເຮັດວຽກ', en: 'Working Visa / Work Permit', th: 'วีซ่าทำงาน / ใบอนุญาตทำงาน' },
    description: { lo: 'ຂໍວີຊ່າເຮັດວຽກ ຫຼື ໃບຢັ້ງຢືນການເຮັດວຽກ ສຳລັບຊາວຕ່າງຊາດທີ່ທຳວຽກຢູ່ລາວ', en: 'Work visa or work permit for foreigners working in Laos. Requires a meet & discuss appointment (B2 step).' },
    icon: '💼',
    outputType: 'physical_doc',
    sortOrder: 6,
    inputs: [
      { key: 'passport_scan', label: { lo: 'ສຳເນົາໜັງສືຜ່ານແດນ', en: 'Passport scan' }, inputType: 'scan', required: true, sortOrder: 1 },
      { key: 'passport_photo', label: { lo: 'ຮູບຖ່າຍ 3×4 ×2 (ພື້ນຫຼັງຂາວ)', en: 'Passport photo 3×4 ×2 (white background)' }, inputType: 'photo', required: true, sortOrder: 2 },
      { key: 'nationality', label: { lo: 'ສັນຊາດ', en: 'Nationality / Country of origin' }, inputType: 'text', required: true, sortOrder: 3 },
    ],
    pricing: [
      { label: { lo: 'ລາຄາຂຶ້ນຢູ່ກັບສັນຊາດ ແລະ ເງື່ອນໄຂ ($480–$680)', en: 'Price depends on nationality and conditions ($480–$680)' }, amount: 480, currency: 'USD', slaDays: 30, pricingMode: 'conditional', conditions: { range: [480, 680], note: 'Exact price confirmed after B2 appointment' } },
    ],
    delivery: ['physical'],
  },
  {
    slug: 'lao-driving-license-foreigner',
    name: { lo: 'ໃບຂັບຂີ່ລາວ (ສຳລັບຊາວຕ່າງຊາດ)', en: 'Lao Driving License (for Foreigners)', th: 'ใบขับขี่ลาว (สำหรับชาวต่างชาติ)' },
    description: { lo: 'ທຳໃບຂັບຂີ່ລາວ ສຳລັບຊາວຕ່າງຊາດທີ່ອາໄສຢູ່ລາວ', en: 'Lao driving license for foreigners residing in Laos' },
    icon: '🪪',
    outputType: 'physical_doc',
    sortOrder: 7,
    inputs: [
      { key: 'current_license', label: { lo: 'ສຳເນົາໃບຂັບຂີ່ປັດຈຸບັນ', en: 'Scan of current driving license' }, inputType: 'scan', required: true, sortOrder: 1 },
      { key: 'passport_photo', label: { lo: 'ຮູບຖ່າຍ 3×4 ×2 (ພື້ນຫຼັງຂາວ)', en: 'Passport photo 3×4 ×2 (white background)' }, inputType: 'photo', required: true, sortOrder: 2 },
    ],
    pricing: [
      { label: { lo: 'ດ່ວນ (1–2 ວັນ)', en: 'Fast (1–2 days)' }, amount: 500000, currency: 'LAK', slaDays: 2, pricingMode: 'flat' },
      { label: { lo: 'ທຳມະດາ (3–5 ວັນ)', en: 'Normal (3–5 days)' }, amount: 350000, currency: 'LAK', slaDays: 5, pricingMode: 'flat' },
    ],
    delivery: ['physical'],
  },
  {
    slug: 'extend-driving-license-lao',
    name: { lo: 'ຕໍ່ໃບຂັບຂີ່ (ພົນລະເມືອງລາວ)', en: 'Extend Driving License (Lao Citizens)', th: 'ต่อใบขับขี่ (พลเมืองลาว)' },
    description: { lo: 'ຕໍ່ອາຍຸໃບຂັບຂີ່ ສຳລັບພົນລະເມືອງລາວ', en: 'Renew/extend driving license for Lao citizens' },
    icon: '📄',
    outputType: 'physical_doc',
    sortOrder: 8,
    inputs: [
      { key: 'current_license', label: { lo: 'ສຳເນົາໃບຂັບຂີ່ປັດຈຸບັນ', en: 'Scan of current driving license' }, inputType: 'scan', required: true, sortOrder: 1 },
      { key: 'passport_photo', label: { lo: 'ຮູບຖ່າຍ 3×4 ×2 (ພື້ນຫຼັງຂາວ)', en: 'Passport photo 3×4 ×2 (white background)' }, inputType: 'photo', required: true, sortOrder: 2 },
    ],
    pricing: [
      { label: { lo: 'ດ່ວນ (1–2 ວັນ)', en: 'Fast (1–2 days)' }, amount: 450000, currency: 'LAK', slaDays: 2, pricingMode: 'flat' },
      { label: { lo: 'ທຳມະດາ (3–5 ວັນ)', en: 'Normal (3–5 days)' }, amount: 350000, currency: 'LAK', slaDays: 5, pricingMode: 'flat' },
    ],
    delivery: ['physical'],
  },
  {
    slug: 'passport-photo',
    name: { lo: 'ຮູບຖ່າຍ (ດິຈິຕອນ + ພິມ + ສົ່ງ)', en: 'Passport Photo (Digital + Print + Deliver)', th: 'รูปถ่าย (ดิจิทัล + พิมพ์ + ส่ง)' },
    description: { lo: 'ຖ່າຍ ແລະ ພິມຮູບຖ່າຍ ພ້ອມຈັດສົ່ງ', en: 'Passport photo editing, printing, and delivery' },
    icon: '📸',
    outputType: 'printed_photos',
    sortOrder: 9,
    inputs: [
      { key: 'headshot', label: { lo: 'ຮູບຕົ້ນສະບັບ (ຫົວ/ຕົວ ສ່ວນເທິງ)', en: 'Clear head/upper-body photo' }, inputType: 'photo', required: true, sortOrder: 1 },
      { key: 'template', label: { lo: 'ແບບ', en: 'Template' }, inputType: 'select', required: true, sortOrder: 2, options: ['male', 'female'] },
      { key: 'background', label: { lo: 'ພື້ນຫຼັງ', en: 'Background colour' }, inputType: 'select', required: true, sortOrder: 3, options: ['white', 'light_blue'] },
    ],
    pricing: [
      { label: { lo: 'ຮູບດິຈິຕອນ', en: 'Digital photo only' }, amount: 20000, currency: 'LAK', slaDays: 1, pricingMode: 'flat' },
      { label: { lo: 'ດິຈິຕອນ + ພິມ 6 ຮູບ (3×4 ຫຼື 4×6)', en: 'Digital + print 6 photos (3×4 or 4×6)' }, amount: 70000, currency: 'LAK', slaDays: 2, pricingMode: 'flat' },
      { label: { lo: '+ ພິມເພີ່ມ 6 ຮູບ', en: '+ 6 extra prints' }, amount: 30000, currency: 'LAK', slaDays: 2, pricingMode: 'flat' },
    ],
    delivery: ['physical', 'digital_pdf'],
  },
] as const;

// ─── Seed functions ────────────────────────────────────────────────────────

async function seedSettings() {
  console.log('Seeding settings...');

  await prisma.setting.upsert({
    where: { key: 'origin_coordinates' },
    create: { key: 'origin_coordinates', value: { lat: 17.9757, lng: 102.6331, label: 'Vientiane Center' } },
    update: {},
  });

  await prisma.setting.upsert({
    where: { key: 'delivery_tiers' },
    create: {
      key: 'delivery_tiers',
      value: [
        { maxKm: 5, feeKip: 50000 },
        { maxKm: 10, feeKip: 100000 },
        { maxKm: 15, feeKip: 150000 },
        { maxKm: 20, feeKip: 200000 },
      ],
    },
    update: {},
  });

  await prisma.setting.upsert({
    where: { key: 'supported_currencies' },
    create: { key: 'supported_currencies', value: ['LAK', 'USD'] },
    update: {},
  });

  await prisma.setting.upsert({
    where: { key: 'office_contact' },
    create: { key: 'office_contact', value: { whatsapp: '', phone: '', line: '' } },
    update: {},
  });
}

async function seedSuperAdmin() {
  console.log('Seeding super_admin...');
  const existing = await prisma.user.findFirst({ where: { email: 'admin@miniagent.la' } });
  if (existing) {
    console.log('  super_admin already exists, skipping.');
    return;
  }
  const passwordHash = await bcrypt.hash('Admin@MiniAgent2024!', 12);
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@miniagent.la',
      passwordHash,
      role: 'super_admin',
      status: 'active',
      locale: 'lo',
    },
  });
  console.log('  Created admin@miniagent.la / Admin@MiniAgent2024!');
}

async function seedServices() {
  console.log('Seeding services...');

  for (const svc of SERVICES) {
    const existing = await prisma.service.findUnique({ where: { slug: svc.slug } });
    if (existing) {
      console.log(`  ${svc.slug} — already exists, skipping.`);
      continue;
    }

    await prisma.service.create({
      data: {
        slug: svc.slug,
        name: svc.name,
        description: svc.description,
        icon: svc.icon,
        outputType: svc.outputType as Parameters<typeof prisma.service.create>[0]['data']['outputType'],
        sortOrder: svc.sortOrder,
        isActive: true,
        inputRequirements: {
          create: svc.inputs.map((inp) => ({
            key: inp.key,
            label: inp.label,
            inputType: inp.inputType as Parameters<typeof prisma.serviceInputRequirement.create>[0]['data']['inputType'],
            required: inp.required,
            sortOrder: inp.sortOrder,
            options: 'options' in inp ? (inp.options as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        },
        pricingOptions: {
          create: svc.pricing.map((p) => ({
            label: p.label,
            amount: p.amount,
            currency: p.currency,
            slaDays: p.slaDays,
            pricingMode: p.pricingMode as Parameters<typeof prisma.pricingOption.create>[0]['data']['pricingMode'],
            conditions: 'conditions' in p ? (p.conditions as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        },
        deliveryOptions: {
          create: svc.delivery.map((type) => ({
            type: type as Parameters<typeof prisma.serviceDeliveryOption.create>[0]['data']['type'],
          })),
        },
      },
    });
    console.log(`  ✓ ${svc.slug}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  await seedSettings();
  await seedSuperAdmin();
  await seedServices();
  console.log('\nSeed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
