# mcp-edd

MCP server for [Easy Digital Downloads](https://easydigitaldownloads.com/) REST API - access sales data, customers, products, and analytics from your EDD store.

[![npm version](https://img.shields.io/npm/v/@verygoodplugins/mcp-edd.svg)](https://www.npmjs.com/package/@verygoodplugins/mcp-edd)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

## Features

- **12 MCP tools** covering all EDD REST API endpoints
- **Sales analytics** - revenue, transaction counts, date ranges
- **Customer data** - purchase history, lifetime value
- **Product catalog** - pricing tiers, licensing info
- **Discount codes** - usage stats and configuration
- **Download logs** - file download tracking

## Installation

```bash
npm install -g @verygoodplugins/mcp-edd
```

Or add to your Claude Desktop configuration directly.

## Configuration

### Environment Variables

Set these environment variables before running the server:

```bash
export EDD_API_URL="https://your-store.com/edd-api/"
export EDD_API_KEY="your-api-public-key"
export EDD_API_TOKEN="your-api-token"
```

Or create a `.env` file in your working directory.

### Getting API Credentials

1. In WordPress admin, go to **Downloads → Settings → API**
2. Generate a new API key for your user
3. Copy the **Public Key** and **Token**
4. Your API URL is `https://your-site.com/edd-api/`

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "edd": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-edd"],
      "env": {
        "EDD_API_URL": "https://your-store.com/edd-api/",
        "EDD_API_KEY": "your-api-public-key",
        "EDD_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Available Tools

### Products

| Tool | Description |
|------|-------------|
| `edd_list_products` | List all products with pricing and stats |
| `edd_get_product` | Get detailed product info by ID |

### Sales

| Tool | Description |
|------|-------------|
| `edd_list_sales` | List recent sales with filters |
| `edd_get_sale` | Get sale by ID or purchase key |

### Customers

| Tool | Description |
|------|-------------|
| `edd_list_customers` | List customers with purchase stats |
| `edd_get_customer` | Get customer by ID or email |

### Statistics

| Tool | Description |
|------|-------------|
| `edd_get_stats` | Get earnings/sales totals |
| `edd_get_stats_by_date` | Get daily stats for date range |
| `edd_get_stats_by_product` | Get stats breakdown by product |

### Discounts

| Tool | Description |
|------|-------------|
| `edd_list_discounts` | List all discount codes |
| `edd_get_discount` | Get discount details by ID |

### Downloads

| Tool | Description |
|------|-------------|
| `edd_get_download_logs` | Get file download history |

## Example Usage

Once configured, you can ask Claude:

- "Show me this month's sales revenue"
- "List the top 10 customers by lifetime value"
- "How many licenses were sold for WP Fusion last month?"
- "Show me all active discount codes"
- "Get the purchase history for customer@example.com"

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test                    # Unit tests
npm run test:integration    # Integration tests (requires credentials)
npm run test:all           # All tests

# Lint
npm run lint
```

## API Reference

This server wraps the [EDD REST API](https://easydigitaldownloads.com/categories/docs/api-reference/). See their documentation for detailed endpoint information.

## License

GPL-3.0 - see [LICENSE](LICENSE) for details.

## Author

[Very Good Plugins](https://verygoodplugins.com)

---

Built with the [Model Context Protocol](https://modelcontextprotocol.io/)
