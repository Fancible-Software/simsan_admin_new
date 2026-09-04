import assert from "node:assert/strict";
import test from "node:test";
import { campaignEmail, escapeHtml } from "../lib/email-templates";

test("customer-controlled values are escaped before entering email HTML", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("all original campaign names render distinct, styled emails", () => {
  const keys = ["canadaDay", "christmas", "thanksgiving", "summer", "winter", "generic"];
  const campaigns = keys.map(campaignEmail);
  assert.equal(new Set(campaigns.map((campaign) => campaign.subject)).size, keys.length);
  for (const campaign of campaigns) {
    assert.match(campaign.html, /Simsan Fraser Maintenance/);
    assert.match(campaign.html, /border-radius/);
  }
});
