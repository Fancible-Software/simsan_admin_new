import assert from "node:assert/strict";
import test from "node:test";
import { percentChange, resolveDashboardRange } from "../lib/dashboard";

const today = new Date("2026-09-04T18:00:00.000Z");

test("dashboard presets create inclusive ranges and matching comparison periods", () => {
  const range = resolveDashboardRange({ preset: "30d" }, today);
  assert.deepEqual(range, {
    preset: "30d",
    start: "2026-08-06",
    end: "2026-09-04",
    previousStart: "2026-07-07",
    previousEnd: "2026-08-05",
    days: 30,
    granularity: "day",
  });
});

test("longer dashboard periods use readable aggregate buckets", () => {
  assert.equal(resolveDashboardRange({ preset: "90d" }, today).granularity, "week");
  assert.equal(resolveDashboardRange({ preset: "ytd" }, today).granularity, "month");
});

test("custom dashboard ranges reject reversed and future dates", () => {
  assert.throws(() => resolveDashboardRange({ preset: "custom", start: "2026-09-04", end: "2026-09-03" }, today), /Start date/);
  assert.throws(() => resolveDashboardRange({ preset: "custom", start: "2026-09-04", end: "2026-09-05" }, today), /future/);
});

test("dashboard comparisons distinguish new activity from percentage change", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(0, 0), 0);
});
