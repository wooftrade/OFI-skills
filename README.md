# OFI-skills

Agent skills for interacting with [Ondo Finance](https://ondo.finance) assets, with a focus on the **Ondo Global Markets (OnGM)** tokenized RWA universe — tokenized stocks (AAPLon, TSLAon, …), ETFs (SPYon, QQQon, …), commodities, fixed income, real-estate, crypto-native and cash-equivalent products deployed across Ethereum, BNB Chain, and Solana.

These skills are designed to be loaded on-demand by VS Code Copilot (and compatible agents) to perform tasks like fetching live prices, 24h changes, holder counts, multi-chain token addresses, and pause/tradable status.

## Requirements

- **Node.js 18+** (uses global `fetch`; no runtime dependencies).

## Repository Layout

```
OFI-skills/
├── README.md
├── package.json          # Test + run scripts (no deps)
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md      # Primary logic & instructions (required)
│       ├── references/   # Supporting docs / deep-dives, loaded on demand
│       ├── scripts/      # CLI tools or helper scripts
│       ├── templates/    # Response format templates
│       └── tests/        # node:test suites + offline fixtures
└── LICENSE
```

## Available Skills

| Skill                                              | Description                                                                                                                                                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ondo-asset-info](skills/ondo-asset-info/SKILL.md) | Live lookups for **Ondo Global Markets (OnGM)** tokenized RWAs — stocks, ETFs, commodities, fixed income, etc. — including price, 24h change, holders, and multi-chain token addresses on Ethereum, BNB Chain, and Solana. |

## Quick Start

```bash
# Market overview
npm run ondo:market

# Single asset (symbol or underlying ticker)
npm run ondo:market -- AAPLon
npm run ondo:market -- TSLA

# Filters / rankings
npm run ondo:market -- --class equities --limit 20
npm run ondo:market -- --top-gainers 10
npm run ondo:market -- --paused
```

Or invoke the script directly: `node skills/ondo-asset-info/scripts/fetch_market.js --help`.

## Tests

All skill helpers are covered by Node-native test suites that run offline against checked-in fixtures (no network calls).

```bash
npm test                       # run every skill's tests
npm run test:ondo-asset-info   # just the ondo-asset-info suite
```

## Adding a New Skill

1. Create a folder under `skills/<skill-name>/`.
2. Add a `SKILL.md` file whose `name` field matches the folder name.
3. Put helper scripts under `./scripts/`, reference docs under `./references/`, response templates under `./templates/`, and tests under `./tests/` — all addressed with relative paths from `SKILL.md`.
4. Keep `SKILL.md` focused — push large reference material into `./references/`.
5. Add a `test:<skill-name>` entry in [package.json](package.json) so it runs in CI.

See the [VS Code Agent Skills docs](https://code.visualstudio.com/docs/copilot/customization/agent-skills) for the full spec.

## License

See [LICENSE](LICENSE).
