import assert from "node:assert/strict";
import test from "node:test";
import { formSchema } from "../lib/validation";

const validForm = {
  type: "FORM", customerName: "Customer", customerEmail: "customer@example.com",
  customerPhone: "6045550100", customerAddress: "1 Main Street", customerPostalCode: "v3a 1a1",
  customerCity: "Surrey", customerProvince: "BC", customerCountry: "Canada",
  total: 100, discount: 10, discount_percent: 10, is_taxable: true, final_amount: 94.5,
  comment: "", services: [{ serviceId: 1, price: 100 }],
};

test("invoice input requires the customer phone retained from the original application", () => {
  assert.equal(formSchema.safeParse({ ...validForm, customerPhone: "" }).success, false);
});

test("invoice input normalizes postal codes to uppercase", () => {
  const result = formSchema.parse(validForm);
  assert.equal(result.customerPostalCode, "V3A 1A1");
});

test("invoice input permits a confirmed fixed discount above the subtotal", () => {
  const result = formSchema.parse({ ...validForm, discount: 110, discount_percent: 110, final_amount: -10.5 });
  assert.equal(result.final_amount, -10.5);
});
