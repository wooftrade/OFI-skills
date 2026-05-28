---
name: ondo-asset-info
description: "Look up live market data for Ondo Global Markets (OndoGM) tokenized real-world assets — tokenized stocks (AAPLon, TSLAon, NVDAon), ETFs (SPYon, QQQon, AGGon), tokenized commodities, fixed-income, real-estate, crypto-native and cash-equivalent RWAs. Use when the user asks about an OndoGM/Ondo Global Markets asset, its price, 24h change, 52-week range, market cap, holder count, tradable sessions, pause status, asset class / sector / instrument type, or its multi-chain token addresses on Ethereum, BNB Chain, or Solana."
argument-hint: "<symbol-or-ticker> (e.g. AAPLon, TSLA, FTGCon) — omit for market overview"
---

# Ondo Asset Info (Ondo Global Markets)

Live lookups for the ~260+ tokenized real-world assets listed on **Ondo Global Markets (OndoGM)**, backed by the public `wooftrade.com` market feed.

## When to Use

- User mentions an OndoGM symbol (anything ending in `on`, e.g. `AAPLon`, `TSLAon`, `SPYon`, `FTGCon`) or the underlying ticker (`AAPL`, `TSLA`, `SPY`).
- User asks for the **price**, **24h change**, **52-week range**, **market cap**, **volume**, or **holder count** of an Ondo Global Markets asset.
- User asks for an OndoGM token's **contract address** on Ethereum, BNB Chain, or Solana, or its **decimals**.
- User asks which assets are **paused**, **tradable**, support **after-hours / 24h** trading, or fit a category (e.g. "Ondo equities", "Ondo ETFs", "Ondo fixed income", "Ondo commodities").
- User wants a **market overview** of Ondo Global Markets — counts by asset class, instrument type, chain.
- User asks for **top gainers / losers** on OndoGM in the last 24h.

Do **not** use this skill for: Ondo Finance's stablecoin / treasury suite (USDY, OUSG, USDtb, OMMF) — those are different products. Also not for trading execution, KYC, or signing.

## Data Source

Single endpoint: `https://www.wooftrade.com/api/get-rwa-market` (returns every listed asset in one document, ~260+ items). Full response schema is documented in [references/api-schema.md](./references/api-schema.md). The helper script caches the response for 60s.

## Procedure

1. **Identify the request shape.**
   - Single asset → resolve the symbol/ticker (e.g. `AAPLon` ≡ `AAPL`).
   - Filter / list → pick the right facet: asset class, instrument type, chain, paused, gainers/losers, free-text search.
   - Overview → no argument.
2. **Fetch the data.** Always go through the helper — do not hardcode addresses or prices.

   ```bash
   # Single asset detail (accepts symbol or underlying ticker)
   node ./scripts/fetch_market.js AAPLon
   node ./scripts/fetch_market.js TSLA

   # Filtered lists
   node ./scripts/fetch_market.js --class equities --limit 20
   node ./scripts/fetch_market.js --instrument etf --limit 20
   node ./scripts/fetch_market.js --chain solana-900 --limit 20
   node ./scripts/fetch_market.js --search snowflake
   node ./scripts/fetch_market.js --paused

   # Rankings
   node ./scripts/fetch_market.js --top-gainers 10
   node ./scripts/fetch_market.js --top-losers 10

   # Market overview
   node ./scripts/fetch_market.js

   # Machine-readable
   node ./scripts/fetch_market.js AAPLon --json
   ```

   Requires Node 18+. No dependencies. Add `--no-cache` to bypass the local cache.

3. **Format the response.**
   - Single asset → use [templates/asset-summary.md](./templates/asset-summary.md).
   - List / overview → a short markdown table works; do not dump raw JSON unless the user asked for it.
   - Always include the `Data as of` timestamp from the response.

## Important Caveats

- **Prices change every few seconds.** Re-fetch before quoting; never cache across turns.
- All numeric fields (`price`, `marketCap`, `volume`, …) are returned as **strings** to preserve precision — parse before doing math.
- A non-null `pause` field can be a _scheduled_ future window (e.g. weekend market hours), not necessarily a currently-active halt. Check `start`/`end`.
- `tradable: true` + non-null `pause` is legitimate — the asset can be tradable now but paused later (or vice-versa).
- Multi-chain: most assets deploy on **BSC (bsc-56)**, **Ethereum (ethereum-1)**, and **Solana (solana-900)** at distinct addresses. Pick the right one for the user's chain.
- This endpoint is not an official Ondo Finance API — it is the feed powering the `wooftrade.com` Ondo Global Markets dashboard. Treat it as best-effort; if it fails, say so rather than guessing.
- The skill is **read-only**. It does not sign or send transactions.

## Tests

The pure helpers in `scripts/fetch_market.js` (parsing, filtering, formatting, projection) are covered by a Node-native test suite that runs against an offline fixture — no network required:

```bash
node --test ./tests/fetch_market.test.js
```

Run this after any change to the script.
