import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default settings...');

  // Vientiane center coordinates
  await prisma.setting.upsert({
    where: { key: 'origin_coordinates' },
    create: {
      key: 'origin_coordinates',
      value: { lat: 17.9757, lng: 102.6331, label: 'Vientiane Center' },
    },
    update: {},
  });

  // Delivery fee tiers (distance from origin in km → fee in LAK)
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

  // Supported currencies
  await prisma.setting.upsert({
    where: { key: 'supported_currencies' },
    create: {
      key: 'supported_currencies',
      value: ['LAK', 'USD'],
    },
    update: {},
  });

  // Office contact
  await prisma.setting.upsert({
    where: { key: 'office_contact' },
    create: {
      key: 'office_contact',
      value: {
        whatsapp: '',
        phone: '',
        line: '',
      },
    },
    update: {},
  });

  console.log('Default settings seeded.');
  console.log('Phase 1 will seed the 8 services.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
