#!/usr/bin/env node
/**
 * fetch_market.js — query the Ondo Global Markets (OndoGM) RWA market feed.
 *
 * Endpoint: https://www.wooftrade.com/api/get-rwa-market
 * Response: { lastUpdatedAt: number, assets: Asset[] }
 *
 * Usage:
 *   node fetch_market.js                       # market overview (counts by asset class / chain)
 *   node fetch_market.js <SYMBOL|TICKER>       # full detail for one asset (e.g. AAPLon or AAPL)
 *   node fetch_market.js --class equities      # filter by asset class
 *   node fetch_market.js --instrument etf      # filter by instrument type (stock|etf)
 *   node fetch_market.js --chain solana-900    # filter by chain (bsc-56|ethereum-1|solana-900)
 *   node fetch_market.js --search tesla        # case-insensitive name/ticker search
 *   node fetch_market.js --top-gainers 10      # top N by 24h pct gain
 *   node fetch_market.js --top-losers 10       # top N by 24h pct loss
 *   node fetch_market.js --paused              # only assets with an active/upcoming pause
 *   node fetch_market.js ... --json            # raw JSON output (machine-readable)
 *   node fetch_market.js ... --limit 20        # cap list output (default 25)
 *   node fetch_market.js ... --no-cache        # bypass the 60s local cache
 *
 * Requires Node 18+ (global fetch). No external dependencies.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const API_URL = "https://www.wooftrade.com/api/get-rwa-market";
const CACHE_FILE = path.join(os.tmpdir(), "ondo-rwa-market.json");
const CACHE_TTL_MS = 60_000;

function parseArgs(argv) {
  const args = {
    positional: null,
    class: null,
    instrument: null,
    chain: null,
    search: null,
    topGainers: null,
    topLosers: null,
    paused: false,
    json: false,
    limit: 25,
    noCache: false,
  };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--") && args.positional === null) {
      args.positional = a;
      continue;
    }
    switch (a) {
      case "--class":
        args.class = rest[++i].toLowerCase();
        break;
      case "--instrument":
        args.instrument = rest[++i].toLowerCase();
        break;
      case "--chain":
        args.chain = rest[++i].toLowerCase();
        break;
      case "--search":
        args.search = rest[++i].toLowerCase();
        break;
      case "--top-gainers":
        args.topGainers = parseInt(rest[++i], 10);
        break;
      case "--top-losers":
        args.topLosers = parseInt(rest[++i], 10);
        break;
      case "--paused":
        args.paused = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--limit":
        args.limit = parseInt(rest[++i], 10);
        break;
      case "--no-cache":
        args.noCache = true;
        break;
      case "-h":
      case "--help":
        process.stdout.write(
          fs.readFileSync(__filename, "utf8").split("*/")[0],
        );
        process.exit(0);
      default:
        console.error(`Unknown arg: ${a}`);
        process.exit(2);
    }
  }
  return args;
}

async function loadMarket(noCache) {
  if (!noCache) {
    try {
      const stat = fs.statSync(CACHE_FILE);
      if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
        return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      }
    } catch {
      /* no cache */
    }
  }
  const res = await fetch(API_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(json));
  } catch {
    /* ignore */
  }
  return json;
}

// ---- helpers ----
const tagOf = (asset, slug) => {
  const t = asset.tags.find((x) => x.categorySlug === slug);
  return t ? t.tagLabel : null;
};
const tagSlug = (asset, slug) => {
  const t = asset.tags.find((x) => x.categorySlug === slug);
  return t ? t.tagSlug : null;
};
const num = (s) => (s == null ? NaN : parseFloat(s));
const fmtPct = (s) => {
  const n = num(s);
  if (!Number.isFinite(n)) return "n/a";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};
const fmtPrice = (s) => {
  const n = num(s);
  if (!Number.isFinite(n)) return "n/a";
  return n >= 100 ? n.toFixed(2) : n.toFixed(4);
};
const fmtBig = (s) => {
  const n = num(s);
  if (!Number.isFinite(n)) return "n/a";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
};

function findAsset(assets, query) {
  const q = query.toLowerCase();
  const qNoOn = q.endsWith("on") ? q.slice(0, -2) : q;
  return (
    assets.find((a) => a.symbol.toLowerCase() === q) ||
    assets.find((a) => a.ticker.toLowerCase() === q) ||
    assets.find((a) => a.ticker.toLowerCase() === qNoOn) ||
    assets.find((a) => a.assetName.toLowerCase() === q)
  );
}

function filterAssets(assets, args) {
  let out = assets;
  if (args.class)
    out = out.filter((a) => tagSlug(a, "asset-class") === args.class);
  if (args.instrument)
    out = out.filter((a) => tagSlug(a, "instrument-type") === args.instrument);
  if (args.chain)
    out = out.filter((a) =>
      a.addresses.some((x) => x.ondoGmNetworkChainId === args.chain),
    );
  if (args.search) {
    const q = args.search;
    out = out.filter(
      (a) =>
        a.assetName.toLowerCase().includes(q) ||
        a.ticker.toLowerCase().includes(q) ||
        a.symbol.toLowerCase().includes(q),
    );
  }
  if (args.paused) out = out.filter((a) => a.pause != null);
  return out;
}

function overview(market) {
  const assets = market.assets;
  const byClass = {};
  const byChain = {};
  const byInstrument = {};
  let paused = 0;
  for (const a of assets) {
    const c = tagOf(a, "asset-class") || "Unknown";
    const i = tagOf(a, "instrument-type") || "Unknown";
    byClass[c] = (byClass[c] || 0) + 1;
    byInstrument[i] = (byInstrument[i] || 0) + 1;
    for (const ad of a.addresses)
      byChain[ad.ondoGmNetworkChainId] =
        (byChain[ad.ondoGmNetworkChainId] || 0) + 1;
    if (a.pause) paused++;
  }
  return {
    lastUpdatedAt: new Date(market.lastUpdatedAt).toISOString(),
    totalAssets: assets.length,
    tradable: assets.filter((a) => a.tradable).length,
    paused,
    byInstrument,
    byAssetClass: byClass,
    deploymentsByChain: byChain,
  };
}

function assetDetail(a) {
  return {
    symbol: a.symbol,
    ticker: a.ticker,
    name: a.assetName,
    iconSrc: a.iconSrc,
    instrumentType: tagOf(a, "instrument-type"),
    assetClass: tagOf(a, "asset-class"),
    sector: tagOf(a, "sector-industry"),
    region: tagOf(a, "region-market-exposure"),
    riskProfile: a.tags
      .filter((t) => t.categorySlug === "type-factor-risk-profile")
      .map((t) => t.tagLabel),
    tradable: a.tradable,
    pause: a.pause,
    primaryMarket: {
      price: a.primaryMarket.price,
      priceChange24h: a.primaryMarket.priceChange24h,
      priceChangePct24h: a.primaryMarket.priceChangePct24h,
      totalHolders: a.primaryMarket.totalHolders,
      sharesMultiplier: a.primaryMarket.sharesMultiplier,
      tradableSessions: a.primaryMarket.tradableSessions,
      priceHistory24hPoints: a.primaryMarket.priceHistory24h?.length ?? 0,
    },
    underlyingMarket: a.underlyingMarket,
    addresses: a.addresses,
    asOf: new Date(a.timestamp).toISOString(),
  };
}

function printAssetDetail(a) {
  const d = assetDetail(a);
  const ch24 = num(d.primaryMarket.priceChangePct24h);
  const arrow = !Number.isFinite(ch24) ? "·" : ch24 >= 0 ? "▲" : "▼";
  console.log(`\n${d.name}  (${d.symbol} / underlying ${d.ticker})`);
  console.log(
    `  ${d.instrumentType ?? "?"} · ${d.assetClass ?? "?"}${d.sector ? " · " + d.sector : ""}${d.region ? " · " + d.region : ""}`,
  );
  if (d.riskProfile.length)
    console.log(`  Risk profile: ${d.riskProfile.join(", ")}`);
  console.log(
    `  Price (primary): $${fmtPrice(d.primaryMarket.price)}  ${arrow} ${fmtPct(d.primaryMarket.priceChangePct24h)} 24h`,
  );
  if (d.underlyingMarket) {
    const u = d.underlyingMarket;
    console.log(
      `  Underlying:      52w $${fmtPrice(u.priceLow52w)} – $${fmtPrice(u.priceHigh52w)}  ·  vol ${fmtBig(u.volume)}  ·  mcap $${fmtBig(u.marketCap)}`,
    );
  }
  console.log(
    `  Holders: ${d.primaryMarket.totalHolders ?? "?"}  ·  Sessions: ${d.primaryMarket.tradableSessions?.join("/") ?? "?"}  ·  Tradable: ${d.tradable}`,
  );
  if (d.pause) {
    console.log(
      `  PAUSE: [${d.pause.status}] ${d.pause.reason?.message ?? d.pause.reason?.code ?? "n/a"}  ${d.pause.start} → ${d.pause.end}`,
    );
  }
  console.log(`  Deployments:`);
  for (const ad of d.addresses) {
    console.log(
      `    - ${ad.ondoGmNetworkChainId.padEnd(12)} ${ad.address}  (${ad.decimals} dec)`,
    );
  }
  console.log(`  Data as of: ${d.asOf}`);
}

function printList(assets, limit) {
  const head = assets.slice(0, limit);
  console.log(`\n${head.length} of ${assets.length} asset(s):\n`);
  console.log(
    "SYMBOL".padEnd(10) +
      "TICKER".padEnd(8) +
      "PRICE".padStart(12) +
      "  24h%   " +
      "CLASS".padEnd(14) +
      "NAME",
  );
  console.log("-".repeat(90));
  for (const a of head) {
    const price = "$" + fmtPrice(a.primaryMarket.price);
    const pct = fmtPct(a.primaryMarket.priceChangePct24h);
    const cls = tagOf(a, "asset-class") ?? "?";
    console.log(
      a.symbol.padEnd(10) +
        a.ticker.padEnd(8) +
        price.padStart(12) +
        "  " +
        pct.padStart(7) +
        "  " +
        cls.padEnd(14) +
        a.assetName,
    );
  }
  if (assets.length > limit)
    console.log(`\n… ${assets.length - limit} more (raise --limit to see)`);
}

async function main() {
  const args = parseArgs(process.argv);
  const market = await loadMarket(args.noCache);

  // single asset detail
  if (args.positional) {
    const a = findAsset(market.assets, args.positional);
    if (!a) {
      console.error(
        `No asset matched "${args.positional}". Try a symbol like AAPLon, a ticker like AAPL, or use --search.`,
      );
      process.exit(1);
    }
    if (args.json) console.log(JSON.stringify(assetDetail(a), null, 2));
    else printAssetDetail(a);
    return;
  }

  // gainers / losers
  if (args.topGainers || args.topLosers) {
    const n = args.topGainers || args.topLosers;
    const sorted = [...market.assets]
      .filter((a) => Number.isFinite(num(a.primaryMarket.priceChangePct24h)))
      .sort(
        (a, b) =>
          num(b.primaryMarket.priceChangePct24h) -
          num(a.primaryMarket.priceChangePct24h),
      );
    const list = args.topGainers
      ? sorted.slice(0, n)
      : sorted.slice(-n).reverse();
    if (args.json) console.log(JSON.stringify(list.map(assetDetail), null, 2));
    else printList(filterAssets(list, args), args.limit);
    return;
  }

  // filtered list / overview
  const filtered = filterAssets(market.assets, args);
  const wantsList =
    args.class || args.instrument || args.chain || args.search || args.paused;

  if (wantsList) {
    if (args.json)
      console.log(JSON.stringify(filtered.map(assetDetail), null, 2));
    else printList(filtered, args.limit);
  } else {
    const ov = overview(market);
    if (args.json) console.log(JSON.stringify(ov, null, 2));
    else {
      console.log(`\nOndo Global Markets — RWA market overview`);
      console.log(`Data as of: ${ov.lastUpdatedAt}`);
      console.log(
        `Total assets: ${ov.totalAssets}  ·  Tradable: ${ov.tradable}  ·  Paused: ${ov.paused}`,
      );
      console.log(`\nBy instrument type:`);
      for (const [k, v] of Object.entries(ov.byInstrument))
        console.log(`  ${k.padEnd(20)} ${v}`);
      console.log(`\nBy asset class:`);
      for (const [k, v] of Object.entries(ov.byAssetClass))
        console.log(`  ${k.padEnd(20)} ${v}`);
      console.log(`\nDeployments by chain:`);
      for (const [k, v] of Object.entries(ov.deploymentsByChain))
        console.log(`  ${k.padEnd(20)} ${v}`);
      console.log(
        `\nTip: pass a SYMBOL (e.g. AAPLon) or use --class / --search / --top-gainers.`,
      );
    }
  }
}

module.exports = {
  parseArgs,
  loadMarket,
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
  API_URL,
  CACHE_FILE,
  CACHE_TTL_MS,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
