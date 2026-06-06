# CLAUDE.md

Development guidance for Claude Code when working on mcp-edd.

## Project Overview

MCP server for Easy Digital Downloads REST API. Provides 12 tools for accessing EDD store data including sales, customers, products, discounts, and statistics.

## Architecture

```
src/
├── index.ts       # MCP server entry, tool definitions
├── edd-client.ts  # EDD REST API client with retry logic
├── types.ts       # Zod schemas and TypeScript types
└── env.ts         # Environment variable validation
```

## Common Commands

```bash
npm run build          # Compile TypeScript
npm run dev            # Watch mode development
npm test               # Unit tests only
npm run test:integration  # Integration tests (needs credentials)
npm run test:all       # All tests
npm run lint           # ESLint
```

## Testing

Unit tests use Jest with mocked fetch. Integration tests require environment variables:

```bash
EDD_API_URL=https://example.com/edd-api/
EDD_API_KEY=your-key
EDD_API_TOKEN=your-token
```

## Key Patterns

- Uses modern McpServer class from SDK 1.x
- Zod schemas for input validation
- Exponential backoff retry (3 attempts)
- Products endpoint is public (no auth), all others require auth

## EDD API Notes

- Auth via query params: `?key=xxx&token=xxx`
- Stats endpoint returns data directly (not wrapped in `stats` object)
- Date format for ranges: YYYYMMDD
- Product and date filters cannot be combined on stats endpoint
