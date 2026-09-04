import type { DocumentData } from "@/lib/invoice";

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: string | number) {
  return `$${Number(value || 0).toFixed(2)} CAD`;
}

const shellStart = `<div style="margin:0;background:#f0eee8;padding:32px 14px;font-family:Arial,sans-serif;color:#171914"><div style="max-width:680px;margin:auto;background:#fffdf8;border-radius:22px;overflow:hidden;box-shadow:0 12px 38px rgba(23,25,20,.12)"><div style="height:8px;background:linear-gradient(90deg,#f45124 0 34%,#171914 34%)"></div><div style="padding:34px">`;
const shellEnd = `<p style="margin:32px 0 0;padding-top:18px;border-top:1px solid #dedbd2;color:#77756d;font-size:12px">Simsan Fraser Maintenance · Professional property care</p></div></div></div>`;

export function documentEmail(document: DocumentData, publicUrl: string) {
  const { form, services, config, seller } = document;
  const label = form.type === "FORM" ? "Invoice" : "Quote";
  const path = label.toLowerCase();
  const rows = services.map((service) => `<tr><td style="padding:11px;border-bottom:1px solid #ece9df">${escapeHtml(service.serviceName)}</td><td style="padding:11px;border-bottom:1px solid #ece9df;text-align:right">${money(service.price)}</td></tr>`).join("");
  const discounted = Number(form.total) - Number(form.discount);
  const tax = Number(form.final_amount) - discounted;
  return `${shellStart}<p style="margin:0;color:#f45124;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${escapeHtml(label)} from Simsan</p><h1 style="margin:8px 0 24px;font-size:42px;line-height:1">${escapeHtml(label)} #${escapeHtml(form.invoiceNumber)}</h1><p>Hello ${escapeHtml(form.customerName)},</p><p>Your ${label.toLowerCase()} is ready. You can review or print the secure document using the button below.</p><p style="margin:24px 0"><a href="${escapeHtml(publicUrl)}/${path}/${form.formId}/${form.invoiceUuid}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:#171914;color:#fff;text-decoration:none;font-weight:700">View ${label}</a></p><table style="width:100%;border-collapse:collapse;margin-top:26px"><thead><tr><th style="padding:11px;text-align:left;background:#171914;color:white">Service</th><th style="padding:11px;text-align:right;background:#171914;color:white">Price</th></tr></thead><tbody>${rows}</tbody></table><div style="margin:22px 0 0 auto;max-width:310px"><p style="display:flex;justify-content:space-between"><span>Subtotal</span><strong>${money(form.total)}</strong></p>${Number(form.discount) > 0 ? `<p style="display:flex;justify-content:space-between"><span>Discount (${Number(form.discount_percent).toFixed(2)}%)</span><strong>− ${money(form.discount)}</strong></p>` : ""}${form.is_taxable ? `<p style="display:flex;justify-content:space-between"><span>GST (5%)</span><strong>${money(tax)}</strong></p>` : ""}<p style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid #171914;font-size:18px"><span>Total</span><strong>${money(form.final_amount)}</strong></p></div><div style="margin-top:26px;padding:18px;border-radius:14px;background:#f4f1e8"><strong>${escapeHtml(config.company_name || "Simsan Fraser Maintenance")}</strong><br>${escapeHtml(config.company_address)} ${escapeHtml(config.company_city)} ${escapeHtml(config.company_zip)}<br>${config.gst ? `GST: ${escapeHtml(config.gst)}<br>` : ""}<span style="color:#77756d">Prepared by ${escapeHtml(seller)}</span></div>${form.comment ? `<p style="margin-top:22px"><strong>Notes</strong><br>${escapeHtml(form.comment)}</p>` : ""}${shellEnd}`;
}

const campaigns: Record<string, { title: string; eyebrow: string; body: string; accent: string }> = {
  canadaDay: { title: "Happy Canada Day", eyebrow: "True north, freshly cared for", body: "Celebrate the season with a property that looks its best—from spotless windows to clean siding, roofs, patios, and walkways.", accent: "#d52b1e" },
  christmas: { title: "Warm Christmas wishes", eyebrow: "From the Simsan team", body: "Thank you for trusting us with your property this year. We wish you a joyful holiday season and a bright start to the new year.", accent: "#1d5538" },
  thanksgiving: { title: "Thank you for your trust", eyebrow: "A Thanksgiving note", body: "We are grateful to serve our community and to help keep your homes and businesses looking their best.", accent: "#b75b24" },
  summer: { title: "Make the outside shine", eyebrow: "Summer property care", body: "Long days reveal every detail. Book professional exterior washing, gutter care, painting, or repairs while the season is on your side.", accent: "#e26a27" },
  winter: { title: "Get ahead of winter", eyebrow: "Seasonal preparation", body: "Protect your property before the cold arrives with gutter cleaning, roof maintenance, leak repair, and exterior preparation.", accent: "#315b70" },
  generic: { title: "Care that shows", eyebrow: "Simsan Fraser Maintenance", body: "From routine cleaning to exterior repairs, our team provides dependable property maintenance with careful, professional service.", accent: "#193b31" },
};

export function campaignEmail(key: string) {
  const campaign = campaigns[key] || campaigns.generic;
  return {
    subject: campaign.title,
    html: `${shellStart}<p style="margin:0;color:${campaign.accent};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${campaign.eyebrow}</p><h1 style="margin:10px 0 20px;font-size:44px;line-height:1;color:#171914">${campaign.title}</h1><p style="font-size:17px;line-height:1.65;color:#46463f">${campaign.body}</p><div style="margin:28px 0;padding:22px;border-radius:16px;background:${campaign.accent};color:white"><strong>Ready for a quote?</strong><p style="margin:8px 0 0;line-height:1.55">Reply to this email or contact Simsan Fraser Maintenance to arrange service.</p></div>${shellEnd}`,
  };
}
