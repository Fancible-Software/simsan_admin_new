export type Role = "admin" | "sub_admin";
export type FormType = "FORM" | "QUOTE";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_no: string;
  roles: Role;
  is_active: number;
  is_verified: boolean;
  createdBy: string;
  createdAt: Date | string;
}

export interface Service {
  serviceId: number;
  serviceName: string;
  isActive: number;
  price: string;
  priority: number | null;
  isDeleted: boolean;
  createdBy: string;
  createdAt: Date | string;
}

export interface FormRecord {
  formId: number;
  invoiceUuid: string;
  type: FormType;
  customerName: string;
  invoiceNumber: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerPostalCode: string;
  customerCity: string;
  customerProvince: string;
  customerCountry: string;
  total: string;
  discount: string;
  discount_percent: string;
  is_taxable: boolean;
  final_amount: string;
  comment: string | null;
  createdBy: string;
  createdAt: Date | string;
  creatorName?: string | null;
}

export interface FormService {
  id: number;
  formId: number;
  serviceId: number;
  price: string;
  serviceName: string;
}
