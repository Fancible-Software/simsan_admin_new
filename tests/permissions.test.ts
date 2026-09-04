import assert from "node:assert/strict";
import test from "node:test";
import { canCreateForm, canEditForm } from "../lib/permissions";

test("sub-admins retain the original quote creation and editing workflow", () => {
  assert.equal(canCreateForm("sub_admin", "QUOTE"), true);
  assert.equal(canEditForm("sub_admin", "QUOTE"), true);
});

test("sub-admins cannot create, edit, or convert records into invoices", () => {
  assert.equal(canCreateForm("sub_admin", "FORM"), false);
  assert.equal(canEditForm("sub_admin", "FORM"), false);
  assert.equal(canEditForm("sub_admin", "QUOTE", "FORM"), false);
});

test("admins can create and edit both document types", () => {
  assert.equal(canCreateForm("admin", "FORM"), true);
  assert.equal(canCreateForm("admin", "QUOTE"), true);
  assert.equal(canEditForm("admin", "FORM", "QUOTE"), true);
  assert.equal(canEditForm("admin", "QUOTE", "FORM"), true);
});
