import { z } from "zod";

export const loginSchema = z.object({ email: z.email().transform((v) => v.toLowerCase()), password: z.string().min(1) });
export const userSchema = z.object({
  first_name: z.string().trim().min(1), last_name: z.string().trim().min(1),
  email: z.email().transform((v) => v.toLowerCase()), mobile_no: z.string().trim().min(7),
  password: z.string().min(8), roles: z.enum(["admin", "sub_admin"]),
});
export const serviceSchema = z.object({
  serviceName: z.string().trim().min(1), price: z.coerce.number().min(0),
  isActive: z.coerce.number().int().min(0).max(1), priority: z.coerce.number().int().min(0).default(0),
});
export const formSchema = z.object({
  type: z.enum(["FORM", "QUOTE"]), customerName: z.string().trim().min(1), customerEmail: z.email(),
  customerPhone: z.string().trim().min(1), customerAddress: z.string().trim().min(1),
  customerPostalCode: z.string().trim().min(1).transform((value) => value.toUpperCase()), customerCity: z.string().trim().min(1),
  customerProvince: z.string().trim().min(1), customerCountry: z.string().trim().default("Canada"),
  total: z.coerce.number().min(0), discount: z.coerce.number().min(0).default(0),
  discount_percent: z.coerce.number().min(0).default(0), is_taxable: z.coerce.boolean(),
  final_amount: z.coerce.number(), comment: z.string().trim().optional().default(""),
  services: z.array(z.object({ serviceId: z.coerce.number().int().positive(), price: z.coerce.number().min(0) })).min(1),
});
export const configurationSchema = z.object({ key: z.string().trim().min(1).transform((v) => v.toLowerCase()), value: z.string(), isImage: z.boolean().default(false) });
export const contactSchema = z.object({ name: z.string().min(1), email: z.email(), phone: z.string().min(7), service: z.string().min(1), address: z.string().optional(), message: z.string().min(1) });
