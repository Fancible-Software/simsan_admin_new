export type DiscountMode = "percent" | "amount";

export interface PricingInput {
  total: number;
  discountMode: DiscountMode;
  discountValue: number;
  taxable: boolean;
}

export interface PricingResult {
  discount: number;
  discountPercent: number;
  subtotal: number;
  tax: number;
  final: number;
}

function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const total = Math.max(0, finite(input.total));
  const value = Math.max(0, finite(input.discountValue));
  const discount = input.discountMode === "percent" ? total * (value / 100) : value;
  const discountPercent = total > 0 ? (discount / total) * 100 : 0;
  const subtotal = total - discount;
  const tax = input.taxable ? subtotal * 0.05 : 0;
  return { discount, discountPercent, subtotal, tax, final: subtotal + tax };
}
