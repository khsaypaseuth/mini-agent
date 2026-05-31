import { DeliveryType } from '@mini-agent/types';
import { advanceFlow, type ServiceLite } from './flow.reducer';

const services: ServiceLite[] = [
  {
    id: 'svc-border',
    slug: 'lao-border-pass',
    name: { lo: 'ໃບຜ່ານແດນ', en: 'Border Pass' },
    pricingOptions: [
      { id: 'po-fast', label: { lo: 'ດ່ວນ', en: 'Fast' }, amount: '300000', currency: 'LAK' },
      { id: 'po-normal', label: { lo: 'ທຳມະດາ', en: 'Normal' }, amount: '200000', currency: 'LAK' },
    ],
    deliveryOptions: [{ type: 'physical' }], // physical only
  },
  {
    id: 'svc-imm',
    slug: 'register-thai-immigration',
    name: { lo: 'ໄອເອັມ', en: 'Immigration' },
    pricingOptions: [
      { id: 'po-imm', label: { lo: 'ຕໍ່ຄົນ', en: 'Per person' }, amount: '20000', currency: 'LAK' },
    ],
    deliveryOptions: [{ type: 'digital_pdf' }, { type: 'physical' }], // both
  },
];

describe('WhatsApp flow reducer', () => {
  it('START lists the service menu and moves to SERVICE', () => {
    const r = advanceFlow({ step: 'START' }, '', services);
    expect(r.state.step).toBe('SERVICE');
    expect(r.reply).toContain('1. ໃບຜ່ານແດນ');
    expect(r.reply).toContain('2. ໄອເອັມ');
  });

  it('SERVICE: valid pick advances to SPEED with the pricing menu', () => {
    const r = advanceFlow({ step: 'SERVICE' }, '1', services);
    expect(r.state.step).toBe('SPEED');
    expect(r.state.serviceId).toBe('svc-border');
    expect(r.reply).toContain('ດ່ວນ');
    expect(r.reply).toContain('300,000');
  });

  it('SERVICE: invalid input re-prompts and stays on SERVICE', () => {
    const r = advanceFlow({ step: 'SERVICE' }, 'banana', services);
    expect(r.state.step).toBe('SERVICE');
    expect(r.reply).toContain('number');
  });

  it('SPEED (single delivery option): emits CREATE_REQUEST with physical delivery', () => {
    const r = advanceFlow(
      { step: 'SPEED', serviceId: 'svc-border', serviceSlug: 'lao-border-pass' },
      '1',
      services,
    );
    expect(r.state.step).toBe('COMPLETE');
    expect(r.action).toEqual({
      type: 'CREATE_REQUEST',
      serviceId: 'svc-border',
      pricingOptionId: 'po-fast',
      deliveryType: DeliveryType.PHYSICAL,
    });
  });

  it('SPEED (both delivery options): asks delivery method, no action yet', () => {
    const r = advanceFlow(
      { step: 'SPEED', serviceId: 'svc-imm', serviceSlug: 'register-thai-immigration' },
      '1',
      services,
    );
    expect(r.state.step).toBe('DELIVERY');
    expect(r.state.pricingOptionId).toBe('po-imm');
    expect(r.action).toBeUndefined();
  });

  it('DELIVERY: choosing 2 (digital) emits CREATE_REQUEST with digital_pdf', () => {
    const r = advanceFlow(
      { step: 'DELIVERY', serviceId: 'svc-imm', pricingOptionId: 'po-imm' },
      '2',
      services,
    );
    expect(r.action?.deliveryType).toBe(DeliveryType.DIGITAL_PDF);
    expect(r.state.step).toBe('COMPLETE');
  });

  it('DELIVERY: invalid input re-prompts', () => {
    const r = advanceFlow(
      { step: 'DELIVERY', serviceId: 'svc-imm', pricingOptionId: 'po-imm' },
      '9',
      services,
    );
    expect(r.action).toBeUndefined();
    expect(r.state.step).toBe('DELIVERY');
  });

  it('reset keyword restarts from any step', () => {
    const r = advanceFlow({ step: 'SPEED', serviceId: 'svc-border' }, 'menu', services);
    expect(r.state.step).toBe('SERVICE');
    expect(r.reply).toContain('1. ໃບຜ່ານແດນ');
  });

  it('Lao greeting also restarts', () => {
    const r = advanceFlow({ step: 'DELIVERY' }, 'ສະບາຍດີ', services);
    expect(r.state.step).toBe('SERVICE');
  });
});
