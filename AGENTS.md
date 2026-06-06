# AGENTS.md

Development guidance for coding agents (Claude Code, Cursor, Codex, and others) when working on mcp-edd.

## Project Overview

MCP server for the Easy Digital Downloads REST API. Registers 16 tools for accessing EDD store data including products, sales, customers, statistics, discounts, and download logs, one of which is a connection validator (`edd_validate_connection`).

## Architecture

```
src/
├── index.ts       # MCP server entry, tool registrations
├── edd-client.ts  # EDD REST API client with retry logic
├── types.ts       # Zod schemas and TypeScript types
├── env.ts         # Environment loading + validation
└── stdio.ts       # Redirects console.log/info/debug to stderr so they can't corrupt the stdio protocol stream
```

`src/stdio.ts` is imported first thing in `src/index.ts:2` so the console patch is applied before anything can write to stdout.

## Tools

All 16 tools are registered via `server.registerTool(...)` in `src/index.ts`:

- `edd_list_products`, `edd_get_product`
- `edd_list_sales`, `edd_get_sale`
- `edd_list_customers`, `edd_get_customer`
- `edd_get_stats`, `edd_get_stats_by_date`, `edd_get_stats_by_product`, `edd_get_stats_by_preset`
- `edd_list_discounts`, `edd_get_discount`, `edd_get_discount_by_code`, `edd_list_active_discounts`
- `edd_get_download_logs`
- `edd_validate_connection`

## Common Commands

```bash
npm run build             # Compile TypeScript (tsc) + chmod +x dist/index.js
npm run dev               # Watch mode (tsx watch src/index.ts)
npm start                 # Run compiled server (node dist/index.js)
npm test                  # Unit tests only
npm run test:integration  # Integration tests (needs credentials)
npm run test:all          # All tests
npm run lint              # ESLint over src/
npm run format            # Prettier write over src/
```

## Testing

Unit tests use Jest with mocked fetch (`tests/unit/`). Integration tests (`tests/integration/`) require environment variables:

```bash
EDD_API_URL=https://example.com/edd-api/
EDD_API_KEY=your-key
EDD_API_TOKEN=your-token
```

## Environment Variables

Validated in `src/env.ts:81` (`validateEnv`); all three are required:

- `EDD_API_URL` — EDD store API base URL (normalized to `.../edd-api/` form)
- `EDD_API_KEY` — EDD API public key
- `EDD_API_TOKEN` — EDD API token

`loadEnv` (`src/env.ts:9`) also reads a `.env` file, searching `./.env`, `$HOME/.mcp-edd.env`, and `$HOME/.config/mcp-edd/.env`.

## Key Patterns

- Uses the modern `McpServer` class from the MCP SDK 1.x (`src/index.ts:3`).
- Zod schemas for input validation.
- Exponential backoff retry, 3 attempts by default (`src/edd-client.ts:147`).
- The V2 products endpoint is public (no auth required for public products); all other endpoints require auth (`src/edd-client.ts:231`).

## EDD API Notes

- Auth via query params: `?key=xxx&token=xxx`.
- Stats endpoint returns data directly (not wrapped in a `stats` object); the client normalizes the flat response.
- Date format for ranges: YYYYMMDD.
- Product and date filters are issued via separate client methods (`getStatsByProduct` vs `getStatsByDateRange`) and are not combined in a single stats request.
