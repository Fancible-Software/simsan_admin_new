import assert from "node:assert/strict";
import test from "node:test";
import { calculatePricing } from "../lib/pricing";

test("percentage discounts are applied before five-percent GST", () => {
  const result = calculatePricing({ total: 200, discountMode: "percent", discountValue: 10, taxable: true });
  assert.deepEqual(result, { discount: 20, discountPercent: 10, subtotal: 180, tax: 9, final: 189 });
});

test("absolute discounts preserve their value and derive their percentage", () => {
  const result = calculatePricing({ total: 240, discountMode: "amount", discountValue: 30, taxable: false });
  assert.deepEqual(result, { discount: 30, discountPercent: 12.5, subtotal: 210, tax: 0, final: 210 });
});

test("confirmed discounts above the service total retain original-project behavior", () => {
  const result = calculatePricing({ total: 50, discountMode: "amount", discountValue: 60, taxable: true });
  assert.equal(result.final, -10.5);
  assert.equal(result.discountPercent, 120);
});
