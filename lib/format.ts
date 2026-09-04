export const money = (value: string | number) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount)
    : "—";
};
export const shortDate = (value: string | Date) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
