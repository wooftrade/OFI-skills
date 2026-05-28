# Ondo Global Markets (OndoGM) — RWA Market API

This skill calls a single public endpoint that aggregates the live state of every
tokenized real-world asset listed on **Ondo Global Markets**.

## Endpoint

```
GET https://www.wooftrade.com/api/get-rwa-market
```

- No auth, no params, no pagination — the entire universe is returned in one JSON document.
- Refresh cadence is short (sub-minute). The script caches the response for 60s in `/tmp`
  to keep repeated lookups cheap. Use `--no-cache` to force a fresh fetch.

## Response shape

```jsonc
{
  "lastUpdatedAt": 1779984704862,           // ms epoch, server-side data timestamp
  "assets": [ Asset, ... ]                  // ~266 assets at last check
}
```

### `Asset`

| Field              | Type               | Notes                                                                                         |
| ------------------ | ------------------ | --------------------------------------------------------------------------------------------- |
| `symbol`           | string             | Tokenized symbol, almost always `<TICKER>on` (e.g. `AAPLon`, `TSLAon`, `FTGCon`).             |
| `ticker`           | string             | Underlying market ticker (e.g. `AAPL`).                                                       |
| `assetName`        | string             | Human-readable issuer / instrument name.                                                      |
| `iconSrc`          | string (URL)       | 160×160 PNG hosted on `cdn.ondo.finance`.                                                     |
| `tags`             | `Tag[]`            | Categorical metadata. See "Tag taxonomy" below.                                               |
| `createdAt`        | number (ms)        | When the token was first listed.                                                              |
| `primaryMarket`    | `PrimaryMarket`    | OndoGM on-chain market state (the tokenized asset itself).                                    |
| `underlyingMarket` | `UnderlyingMarket` | Reference data for the underlying off-chain instrument.                                       |
| `timestamp`        | number (ms)        | Per-asset data fetch timestamp.                                                               |
| `addresses`        | `Address[]`        | Multi-chain deployment list.                                                                  |
| `tradable`         | boolean            | Currently tradable on OndoGM.                                                                 |
| `pause`            | `Pause \| null`    | If non-null, the asset is paused or has a scheduled pause window (often weekends / earnings). |

### `Tag`

```jsonc
{
  "categoryLayer": "1" | "2" | "3a" | "3b" | "4",
  "categorySlug": "asset-class" | "instrument-type" | "sector-industry"
                 | "type-factor-risk-profile" | "region-market-exposure",
  "categoryLabel": string,
  "tagSlug":  string,   // machine key (e.g. "equities", "etf", "technology")
  "tagLabel": string    // human label (e.g. "Equities", "ETF", "Technology")
}
```

### `PrimaryMarket`

```jsonc
{
  "symbol":            string,    // mirrors Asset.symbol
  "price":             string,    // high-precision decimal string
  "priceChange24h":    string,    // absolute 24h delta in quote currency
  "priceChangePct24h": string,    // 24h delta in percent
  "priceHistory24h":   [ { "timestamp": number, "price": string } ],  // ~96–100 points
  "totalHolders":      number,    // unique on-chain holders across deployments
  "sharesMultiplier":  string,    // OndoGM share multiplier vs. underlying
  "tradableSessions":  string[]   // any of: "premarket", "regular", "postmarket", "overnight"
}
```

### `UnderlyingMarket`

```jsonc
{
  "ticker":            string,
  "name":              string,
  "priceHigh52w":      string,
  "priceLow52w":       string,
  "volume":            string,    // most-recent session volume
  "averageVolume":     string,
  "sharesOutstanding": string,
  "marketCap":         string
}
```

### `Address`

```jsonc
{
  "chainName":            "BSC" | "ETHEREUM" | null,   // null for non-EVM (e.g. Solana)
  "ondoGmNetworkChainId": "bsc-56" | "ethereum-1" | "solana-900",
  "address":              string,    // hex for EVM, base58 for Solana
  "decimals":             number     // 18 on EVM, 9 on Solana
}
```

### `Pause`

```jsonc
{
  "status": string,         // e.g. "scheduled", "active"
  "type":   string,         // e.g. "market-hours", "corporate-action"
  "reason": { "code": string, "message": string },
  "start":  string,         // ISO timestamp
  "end":    string          // ISO timestamp
}
```

## Tag taxonomy (observed values)

- **asset-class**: `equities`, `commodities`, `fixed-income`, `real-estate-assets`,
  `crypto-native-assets`, `cash-equivalent`
- **instrument-type**: `stock`, `etf`
- **sector-industry**: GICS-style sectors (`technology`, `materials`, `healthcare`, …)
- **type-factor-risk-profile**: e.g. `dividend`, `large-cap`, `diversified`, `growth`
- **region-market-exposure**: e.g. `us`, `global`

## Practical notes

- `price`, `priceChange*`, and underlying numeric fields are returned as **strings**
  to preserve precision — always parse before doing math.
- Most assets ship on all three supported chains (BSC, Ethereum, Solana). A small
  number are EVM-only.
- A non-null `pause` does not always mean "tradable=false" — it can describe an
  upcoming/scheduled window. Always check `start`/`end`.
- `tradableSessions` is the easiest signal for after-hours / 24h tokens.
- The endpoint is unofficial in the sense that it powers the `wooftrade.com`
  Ondo Global Markets dashboard. Treat it as best-effort; cache and degrade gracefully.
