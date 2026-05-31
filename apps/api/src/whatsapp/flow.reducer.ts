import { DeliveryType } from '@mini-agent/types';

export type FlowStep = 'START' | 'SERVICE' | 'SPEED' | 'DELIVERY' | 'COMPLETE';

export interface FlowState {
  step: FlowStep;
  serviceId?: string;
  serviceSlug?: string;
  pricingOptionId?: string;
  deliveryType?: DeliveryType;
}

export interface ServiceLite {
  id: string;
  slug: string;
  name: Record<string, string>;
  pricingOptions: { id: string; label: Record<string, string>; amount: string; currency: string }[];
  deliveryOptions: { type: string }[];
}

export interface CreateRequestAction {
  type: 'CREATE_REQUEST';
  serviceId: string;
  pricingOptionId: string;
  deliveryType: DeliveryType;
}

export interface FlowResult {
  state: FlowState;
  reply: string;
  action?: CreateRequestAction;
}

const RESET_WORDS = ['menu', 'start', 'hi', 'hello', 'ສະບາຍດີ', 'ເມນູ', 'เมนู'];

function nameOf(name: Record<string, string>): string {
  return name.lo ?? name.en ?? Object.values(name)[0] ?? '';
}

function parseChoice(text: string): number | null {
  const n = parseInt(text.trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function serviceMenu(services: ServiceLite[]): string {
  const lines = services.map((s, i) => `${i + 1}. ${nameOf(s.name)}`).join('\n');
  return `🙏 ສະບາຍດີ! ຍິນດີຕ້ອນຮັບສູ່ MiniAgent\nWelcome to MiniAgent — reply with a number:\n\n${lines}`;
}

function speedMenu(service: ServiceLite): string {
  const lines = service.pricingOptions
    .map(
      (p, i) => `${i + 1}. ${nameOf(p.label)} — ${Number(p.amount).toLocaleString()} ${p.currency}`,
    )
    .join('\n');
  return `${nameOf(service.name)}\nເລືອກຄວາມໄວ / Select speed:\n\n${lines}`;
}

/**
 * Pure conversation reducer for the WhatsApp guided intake.
 * Side-effects (creating the request) are returned as an `action` for the
 * caller to execute, keeping this function deterministic and testable.
 */
export function advanceFlow(
  state: FlowState,
  rawText: string,
  services: ServiceLite[],
): FlowResult {
  const text = rawText.trim();

  // A reset keyword always restarts the conversation.
  if (RESET_WORDS.includes(text.toLowerCase())) {
    return { state: { step: 'SERVICE' }, reply: serviceMenu(services) };
  }

  switch (state.step) {
    case 'START':
      return { state: { step: 'SERVICE' }, reply: serviceMenu(services) };

    case 'SERVICE': {
      const choice = parseChoice(text);
      const service = choice ? services[choice - 1] : undefined;
      if (!service) {
        return {
          state,
          reply: `❓ ກະລຸນາຕອບເປັນຕົວເລກ / Please reply with a number.\n\n${serviceMenu(services)}`,
        };
      }
      return {
        state: { step: 'SPEED', serviceId: service.id, serviceSlug: service.slug },
        reply: speedMenu(service),
      };
    }

    case 'SPEED': {
      const service = services.find((s) => s.id === state.serviceId);
      const choice = parseChoice(text);
      const option = service && choice ? service.pricingOptions[choice - 1] : undefined;
      if (!service || !option) {
        return { state, reply: `❓ ກະລຸນາເລືອກຄວາມໄວ / Please pick a valid option.` };
      }

      const deliveryTypes = service.deliveryOptions.map((d) => d.type);
      const offersPhysical = deliveryTypes.some((t) => t !== DeliveryType.DIGITAL_PDF);
      const offersDigital = deliveryTypes.some(
        (t) => t === DeliveryType.DIGITAL_PDF || t === DeliveryType.BOTH,
      );

      // Both options → ask. Single option → go straight to creating the request.
      if (offersPhysical && offersDigital) {
        return {
          state: { ...state, step: 'DELIVERY', pricingOptionId: option.id },
          reply: `ຮັບແບບໃດ? / How to receive?\n1. ຈັດສົ່ງເຖິງປະຕູ (delivery)\n2. ດິຈິຕອນ PDF (digital)`,
        };
      }

      const deliveryType = offersPhysical ? DeliveryType.PHYSICAL : DeliveryType.DIGITAL_PDF;
      return buildCreate(state, option.id, deliveryType);
    }

    case 'DELIVERY': {
      const choice = parseChoice(text);
      if (choice !== 1 && choice !== 2) {
        return { state, reply: `❓ ຕອບ 1 ຫຼື 2 / Reply 1 or 2.` };
      }
      const deliveryType = choice === 1 ? DeliveryType.PHYSICAL : DeliveryType.DIGITAL_PDF;
      return buildCreate(state, state.pricingOptionId!, deliveryType);
    }

    case 'COMPLETE':
    default:
      return { state: { step: 'SERVICE' }, reply: serviceMenu(services) };
  }
}

function buildCreate(
  state: FlowState,
  pricingOptionId: string,
  deliveryType: DeliveryType,
): FlowResult {
  return {
    state: { ...state, step: 'COMPLETE', pricingOptionId, deliveryType },
    reply: '', // caller fills in the link after creating the request
    action: { type: 'CREATE_REQUEST', serviceId: state.serviceId!, pricingOptionId, deliveryType },
  };
}
