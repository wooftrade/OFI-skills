# Response template — Ondo Global Markets asset summary

Use this shape when summarizing a single OndoGM tokenized asset.

---

**{{ASSET_NAME}}** — `{{SYMBOL}}` (underlying ticker `{{TICKER}}`)

- **Instrument:** {{INSTRUMENT_TYPE}} · **Asset class:** {{ASSET_CLASS}}
- **Sector / region:** {{SECTOR}} · {{REGION}}
- **Risk profile:** {{RISK_PROFILE}}

## Market

| Metric               | Value                                           |
| -------------------- | ----------------------------------------------- |
| OndoGM price         | ${{PRICE}}                                      |
| 24h change           | {{PRICE_CHANGE_24H}} ({{PRICE_CHANGE_PCT_24H}}) |
| Underlying 52w range | ${{PRICE_LOW_52W}} – ${{PRICE_HIGH_52W}}        |
| Underlying mcap      | ${{MARKET_CAP}}                                 |
| Underlying volume    | {{VOLUME}} (avg {{AVERAGE_VOLUME}})             |
| Total holders        | {{TOTAL_HOLDERS}}                               |
| Tradable sessions    | {{TRADABLE_SESSIONS}}                           |
| Tradable now         | {{TRADABLE}}                                    |

{{PAUSE_BLOCK}}

## On-chain deployments

| Chain | Address | Decimals |
| ----- | ------- | -------- |

{{ADDRESSES_TABLE}}

> Data as of {{AS_OF}} — source: `https://www.wooftrade.com/api/get-rwa-market`. Prices move every few seconds; re-query before acting.
