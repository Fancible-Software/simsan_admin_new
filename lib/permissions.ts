import type { FormType, Role } from "@/lib/types";

export function canCreateForm(role: Role, type: FormType) {
  return role === "admin" || type === "QUOTE";
}

export function canEditForm(role: Role, currentType: FormType, nextType: FormType = currentType) {
  return role === "admin" || (currentType === "QUOTE" && nextType === "QUOTE");
}
