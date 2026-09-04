"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { money } from "@/lib/format";
import { calculatePricing, type DiscountMode } from "@/lib/pricing";
import type { FormRecord, FormType, Service } from "@/lib/types";

interface Province { province_id: string; province_name: string }
interface City { city: string; province_id: string }
interface Existing extends FormRecord { services: { serviceId: number; price: string }[] }
interface Customer {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerPostalCode: string;
  customerCity: string;
  customerProvince: string;
  customerCountry: string;
  comment: string;
}

const blank: Customer = {
  customerName: "", customerEmail: "", customerPhone: "", customerAddress: "",
  customerPostalCode: "", customerCity: "", customerProvince: "",
  customerCountry: "Canada", comment: "",
};

export function FormEditor({ type: initialType, id }: { type: FormType; id?: number }) {
  const router = useRouter();
  const [type, setType] = useState(initialType);
  const [customer, setCustomer] = useState(blank);
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxable, setTaxable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ rows: Service[] }>("/api/services?limit=200"),
      api<Province[]>("/api/locations/provinces"),
      id ? api<Existing>(`/api/forms/${id}`) : Promise.resolve(null),
    ]).then(([serviceData, provinceData, record]) => {
      setServices(serviceData.rows.filter((service) => !service.isDeleted));
      setProvinces(provinceData);
      if (record) {
        setType(record.type);
        setCustomer({
          customerName: record.customerName, customerEmail: record.customerEmail,
          customerPhone: record.customerPhone || "", customerAddress: record.customerAddress,
          customerPostalCode: record.customerPostalCode, customerCity: record.customerCity,
          customerProvince: record.customerProvince, customerCountry: record.customerCountry,
          comment: record.comment || "",
        });
        setDiscountMode("amount");
        setDiscountValue(Number(record.discount) || 0);
        setTaxable(record.is_taxable);
        setSelected(Object.fromEntries(record.services.map((service) => [service.serviceId, Number(service.price)])));
      }
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load the editor"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!customer.customerProvince) return;
    api<City[]>(`/api/locations/cities?province=${encodeURIComponent(customer.customerProvince)}`)
      .then(setCities).catch(() => setCities([]));
  }, [customer.customerProvince]);

  const total = useMemo(() => Object.values(selected).reduce((sum, value) => sum + (Number(value) || 0), 0), [selected]);
  const pricing = calculatePricing({ total, discountMode, discountValue, taxable });

  function update<K extends keyof Customer>(key: K, value: Customer[K]) {
    setCustomer((current) => ({ ...current, [key]: value }));
  }

  function toggle(service: Service, checked: boolean) {
    setSelected((current) => {
      const next = { ...current };
      if (checked) next[service.serviceId] = Number(service.price);
      else delete next[service.serviceId];
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!Object.keys(selected).length) {
      setError("Select at least one service.");
      return;
    }
    if (pricing.discount > total && !window.confirm("The discount is larger than the service total. Save this record anyway?")) return;
    setBusy(true);
    try {
      const payload = {
        ...customer,
        customerPostalCode: customer.customerPostalCode.toUpperCase(),
        type, total, discount: pricing.discount, discount_percent: pricing.discountPercent,
        is_taxable: taxable, final_amount: pricing.final,
        services: Object.entries(selected).map(([serviceId, price]) => ({ serviceId: Number(serviceId), price })),
      };
      await api(id ? `/api/forms/${id}` : "/api/forms", { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      router.push(`/admin/${type === "FORM" ? "invoices" : "quotes"}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save record");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="empty">Loading editor…</div>;
  const percentageValue = discountMode === "percent" ? discountValue : pricing.discountPercent;
  const amountValue = discountMode === "amount" ? discountValue : pricing.discount;

  return <>
    <div className="page-head"><div><span className="eyebrow">{id ? "Edit record" : "New customer record"}</span><h1>{id ? "Edit" : "Create"} {type === "FORM" ? "invoice" : "quote"}</h1><p>Customer details, selected services and pricing in one place.</p></div></div>
    {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
    <form onSubmit={submit} className="form-stack">
      <section className="card">
        <h2>Document type</h2>
        <div className="actions">
          <label className="button secondary"><input type="radio" name="type" checked={type === "FORM"} onChange={() => setType("FORM")}/> Invoice</label>
          <label className="button secondary"><input type="radio" name="type" checked={type === "QUOTE"} onChange={() => setType("QUOTE")}/> Quote</label>
        </div>
      </section>
      <section className="card">
        <h2>Customer details</h2>
        <div className="form-grid">
          <Field label="Name"><input value={customer.customerName} onChange={(event) => update("customerName", event.target.value)} required/></Field>
          <Field label="Email"><input type="email" value={customer.customerEmail} onChange={(event) => update("customerEmail", event.target.value)} required/></Field>
          <Field label="Phone"><input value={customer.customerPhone} onChange={(event) => update("customerPhone", event.target.value)} required/></Field>
          <Field label="Street address"><input value={customer.customerAddress} onChange={(event) => update("customerAddress", event.target.value)} required/></Field>
          <Field label="Province"><select value={customer.customerProvince} onChange={(event) => { update("customerProvince", event.target.value); update("customerCity", ""); }} required><option value="">Choose a province</option>{provinces.map((province) => <option key={province.province_id} value={province.province_id}>{province.province_name}</option>)}</select></Field>
          <Field label="City"><select value={customer.customerCity} onChange={(event) => update("customerCity", event.target.value)} required><option value="">Choose a city</option>{customer.customerCity && !cities.some((city) => city.city === customer.customerCity) && <option value={customer.customerCity}>{customer.customerCity}</option>}{cities.map((city) => <option key={city.city} value={city.city}>{city.city}</option>)}</select></Field>
          <Field label="Postal code"><input value={customer.customerPostalCode} onChange={(event) => update("customerPostalCode", event.target.value.toUpperCase())} required/></Field>
          <Field label="Country"><input value={customer.customerCountry} onChange={(event) => update("customerCountry", event.target.value)} required/></Field>
          <div className="field span-2"><label>Comment</label><textarea value={customer.comment} onChange={(event) => update("comment", event.target.value)}/></div>
        </div>
      </section>
      <section className="card service-picker-card">
        <h2>Services</h2>
        <div className="service-picker">{services.map((service) => {
          const checked = selected[service.serviceId] !== undefined;
          return <div className="service-row" key={service.serviceId}>
            <label><input type="checkbox" checked={checked} onChange={(event) => toggle(service, event.target.checked)}/> <strong>{service.serviceName}</strong></label>
            <div className="field"><label>Price</label><input type="number" min="0" step="0.01" disabled={!checked} value={checked ? selected[service.serviceId] : service.price} onChange={(event) => setSelected((current) => ({ ...current, [service.serviceId]: Number(event.target.value) }))}/></div>
            <span className={`badge ${service.isActive ? "" : "off"}`}>{service.isActive ? "On" : "Off"}</span>
          </div>;
        })}</div>
      </section>
      <section className="card">
        <h2>Pricing</h2>
        <div className="form-grid">
          <Field label="Discount percentage"><input type="number" min="0" step="0.01" value={Number(percentageValue.toFixed(2))} onChange={(event) => { setDiscountMode("percent"); setDiscountValue(Math.max(0, Number(event.target.value))); }}/></Field>
          <Field label="Discount amount"><input type="number" min="0" step="0.01" value={Number(amountValue.toFixed(2))} onChange={(event) => { setDiscountMode("amount"); setDiscountValue(Math.max(0, Number(event.target.value))); }}/></Field>
          <div className="field span-2"><label>Tax</label><label className="button secondary" style={{ justifyContent: "flex-start" }}><input type="checkbox" checked={taxable} onChange={(event) => setTaxable(event.target.checked)}/> Apply 5% GST</label></div>
          <div className="span-2 totals">
            <div className="total-row"><span>Services</span><strong>{money(total)}</strong></div>
            <div className="total-row"><span>Discount</span><strong>− {money(pricing.discount)}</strong></div>
            {taxable && <div className="total-row"><span>GST (5%)</span><strong>{money(pricing.tax)}</strong></div>}
            <div className="total-row grand"><span>Total</span><strong>{money(pricing.final)}</strong></div>
          </div>
        </div>
      </section>
      <div className="actions"><button className="button" disabled={busy}>{busy ? "Saving…" : `Save ${type === "FORM" ? "invoice" : "quote"}`}</button><button type="button" className="button secondary" onClick={() => router.back()}>Cancel</button></div>
    </form>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
