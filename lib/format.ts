export const money = (value: string | number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(value) || 0);
export const shortDate = (value: string | Date) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
