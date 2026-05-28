"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  parseArgs,
  tagOf,
  tagSlug,
  num,
  fmtPct,
  fmtPrice,
  fmtBig,
  findAsset,
  filterAssets,
  overview,
  assetDetail,
} = require("../scripts/fetch_market.js");

const FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/market.sample.json"), "utf8"),
);
const ASSETS = FIXTURE.assets;
const aapl = ASSETS[0];
const spy = ASSETS[1];
const agg = ASSETS[2];

// ---- formatters ----
test("num parses strings and tolerates null/NaN", () => {
  assert.equal(num("12.5"), 12.5);
  assert.equal(num("0"), 0);
  assert.ok(Number.isNaN(num(null)));
  assert.ok(Number.isNaN(num(undefined)));
  assert.ok(Number.isNaN(num("not-a-number")));
});

test("fmtPct prefixes sign and rounds to 2dp", () => {
  assert.equal(fmtPct("0"), "+0.00%");
  assert.equal(fmtPct("1.2345"), "+1.23%");
  assert.equal(fmtPct("-0.226"), "-0.23%");
  assert.equal(fmtPct(null), "n/a");
  assert.equal(fmtPct("bogus"), "n/a");
});

test("fmtPrice uses 2dp for >=100, 4dp otherwise", () => {
  assert.equal(fmtPrice("311.43"), "311.43");
  assert.equal(fmtPrice("99.5"), "99.5000");
  assert.equal(fmtPrice("0.12345"), "0.1235");
  assert.equal(fmtPrice(null), "n/a");
});

test("fmtBig collapses with T/B/M/K suffixes", () => {
  assert.equal(fmtBig("4560000000000"), "4.56T");
  assert.equal(fmtBig("550000000000"), "550.00B");
  assert.equal(fmtBig("14030000"), "14.03M");
  assert.equal(fmtBig("8500"), "8.50K");
  assert.equal(fmtBig("42"), "42.00");
  assert.equal(fmtBig(null), "n/a");
});

// ---- tag helpers ----
test("tagOf and tagSlug return label/slug or null", () => {
  assert.equal(tagOf(aapl, "asset-class"), "Equities");
  assert.equal(tagSlug(aapl, "asset-class"), "equities");
  assert.equal(tagOf(aapl, "instrument-type"), "Stock");
  assert.equal(tagSlug(spy, "instrument-type"), "etf");
  assert.equal(tagOf(aapl, "nonexistent"), null);
  assert.equal(tagSlug(aapl, "nonexistent"), null);
});

// ---- findAsset ----
test("findAsset matches by symbol, ticker, and case-insensitively", () => {
  assert.equal(findAsset(ASSETS, "AAPLon"), aapl);
  assert.equal(findAsset(ASSETS, "aaplon"), aapl);
  assert.equal(findAsset(ASSETS, "AAPL"), aapl);
  assert.equal(findAsset(ASSETS, "spy"), spy);
});

test("findAsset strips trailing 'on' when symbol lookup fails", () => {
  // "agg" is the ticker, also "aggon" is the symbol — both should resolve.
  assert.equal(findAsset(ASSETS, "AGGon"), agg);
  assert.equal(findAsset(ASSETS, "AGG"), agg);
});

test("findAsset matches by full asset name", () => {
  assert.equal(findAsset(ASSETS, "Apple"), aapl);
});

test("findAsset returns undefined on miss", () => {
  assert.equal(findAsset(ASSETS, "NOPEon"), undefined);
});

// ---- filterAssets ----
test("filterAssets by asset class", () => {
  const out = filterAssets(ASSETS, { class: "fixed-income" });
  assert.deepEqual(
    out.map((a) => a.symbol),
    ["AGGon"],
  );
});

test("filterAssets by instrument type", () => {
  const out = filterAssets(ASSETS, { instrument: "etf" });
  assert.deepEqual(out.map((a) => a.symbol).sort(), ["AGGon", "SPYon"]);
});

test("filterAssets by chain", () => {
  const sol = filterAssets(ASSETS, { chain: "solana-900" });
  assert.deepEqual(sol.map((a) => a.symbol).sort(), ["AAPLon", "AGGon"]);
  const eth = filterAssets(ASSETS, { chain: "ethereum-1" });
  assert.deepEqual(eth.map((a) => a.symbol).sort(), ["AAPLon", "SPYon"]);
});

test("filterAssets by search (name, ticker, symbol)", () => {
  assert.equal(filterAssets(ASSETS, { search: "apple" }).length, 1);
  assert.equal(filterAssets(ASSETS, { search: "spy" }).length, 1);
  assert.equal(filterAssets(ASSETS, { search: "bond" }).length, 1);
  assert.equal(filterAssets(ASSETS, { search: "xxxx" }).length, 0);
});

test("filterAssets paused-only", () => {
  const out = filterAssets(ASSETS, { paused: true });
  assert.deepEqual(
    out.map((a) => a.symbol),
    ["SPYon"],
  );
});

test("filterAssets combines facets", () => {
  const out = filterAssets(ASSETS, { class: "equities", instrument: "etf" });
  assert.deepEqual(
    out.map((a) => a.symbol),
    ["SPYon"],
  );
});

// ---- overview ----
test("overview aggregates counts correctly", () => {
  const ov = overview(FIXTURE);
  assert.equal(ov.totalAssets, 3);
  assert.equal(ov.tradable, 3);
  assert.equal(ov.paused, 1);
  assert.equal(ov.byAssetClass["Equities"], 2);
  assert.equal(ov.byAssetClass["Fixed Income"], 1);
  assert.equal(ov.byInstrument["Stock"], 1);
  assert.equal(ov.byInstrument["ETF"], 2);
  assert.equal(ov.deploymentsByChain["bsc-56"], 2);
  assert.equal(ov.deploymentsByChain["ethereum-1"], 2);
  assert.equal(ov.deploymentsByChain["solana-900"], 2);
  assert.match(ov.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

// ---- assetDetail ----
test("assetDetail projects the public-facing fields", () => {
  const d = assetDetail(aapl);
  assert.equal(d.symbol, "AAPLon");
  assert.equal(d.ticker, "AAPL");
  assert.equal(d.name, "Apple");
  assert.equal(d.assetClass, "Equities");
  assert.equal(d.instrumentType, "Stock");
  assert.equal(d.sector, "Technology");
  assert.equal(d.region, "US");
  assert.deepEqual(d.riskProfile, ["Large Cap"]);
  assert.equal(d.tradable, true);
  assert.equal(d.pause, null);
  assert.equal(d.primaryMarket.priceHistory24hPoints, 2);
  assert.equal(d.addresses.length, 3);
  assert.match(d.asOf, /^\d{4}-\d{2}-\d{2}T/);
});

test("assetDetail handles pause and missing optional tags", () => {
  const d = assetDetail(spy);
  assert.equal(d.sector, null);
  assert.equal(d.region, null);
  assert.deepEqual(d.riskProfile, []);
  assert.equal(d.pause.status, "scheduled");
  assert.equal(d.pause.reason.code, "weekend");
});

// ---- parseArgs ----
test("parseArgs defaults", () => {
  const a = parseArgs(["node", "fetch_market.js"]);
  assert.equal(a.positional, null);
  assert.equal(a.class, null);
  assert.equal(a.instrument, null);
  assert.equal(a.chain, null);
  assert.equal(a.search, null);
  assert.equal(a.topGainers, null);
  assert.equal(a.topLosers, null);
  assert.equal(a.paused, false);
  assert.equal(a.json, false);
  assert.equal(a.limit, 25);
  assert.equal(a.noCache, false);
});

test("parseArgs reads positional symbol and flags", () => {
  const a = parseArgs([
    "node",
    "fetch_market.js",
    "AAPLon",
    "--class",
    "Equities",
    "--instrument",
    "STOCK",
    "--chain",
    "Ethereum-1",
    "--search",
    "Apple",
    "--limit",
    "5",
    "--json",
    "--no-cache",
  ]);
  assert.equal(a.positional, "AAPLon");
  assert.equal(a.class, "equities"); // lowercased
  assert.equal(a.instrument, "stock");
  assert.equal(a.chain, "ethereum-1");
  assert.equal(a.search, "apple");
  assert.equal(a.limit, 5);
  assert.equal(a.json, true);
  assert.equal(a.noCache, true);
});

test("parseArgs handles --top-gainers / --top-losers / --paused", () => {
  const g = parseArgs(["node", "x", "--top-gainers", "10"]);
  assert.equal(g.topGainers, 10);
  const l = parseArgs(["node", "x", "--top-losers", "3"]);
  assert.equal(l.topLosers, 3);
  const p = parseArgs(["node", "x", "--paused"]);
  assert.equal(p.paused, true);
});
