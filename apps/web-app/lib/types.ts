export interface PricingOption {
  id: string;
  label: Record<string, string>;
  amount: string;
  currency: string;
  slaDays: number;
  pricingMode: string;
}

export interface InputRequirement {
  id: string;
  key: string;
  label: Record<string, string>;
  inputType: string;
  required: boolean;
  options: unknown;
}

export interface DeliveryOption {
  id: string;
  type: string;
}

export interface Service {
  id: string;
  slug: string;
  name: Record<string, string>;
  description: Record<string, string>;
  icon: string | null;
  outputType: string;
  pricingOptions: PricingOption[];
  inputRequirements: InputRequirement[];
  deliveryOptions: DeliveryOption[];
}

export interface CustomerRequest {
  id: string;
  requestNumber: string;
  publicToken: string;
  status: string;
  deliveryType: string;
  totalAmount: string | null;
  deliveryFee: string | null;
  currency: string;
  createdAt: string;
  service: { slug: string; name: Record<string, string>; outputType: string };
  inputs: { id: string; requirementKey: string; textValue: string | null; fileId: string | null }[];
}
