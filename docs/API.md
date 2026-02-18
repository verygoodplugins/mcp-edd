# EDD MCP Server API Reference

Complete API documentation for all MCP tools provided by this server.

## Table of Contents

- [Authentication](#authentication)
- [Products](#products)
- [Customers](#customers)
- [Sales](#sales)
- [Discounts](#discounts)
- [Statistics](#statistics)
- [File Download Logs](#file-download-logs)
- [Utility](#utility)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)

---

## Authentication

The EDD API uses query parameter authentication:

- **API Key**: Your public API key
- **API Token**: Your secret API token

Get credentials from: **WordPress Admin > Downloads > Settings > API**

Your API URL is typically `https://your-site.com/edd-api/`.

---

## Products

### edd_list_products

List products from the EDD store with pricing and stats. Uses the V2 API, which returns richer data including `sku`, category/tag objects, and file metadata. Optionally search by keyword, filter by category slug/ID, or filter by tag slug/ID. Category and tag filters can be combined.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `number` | number | No | Number of products to return (default: all) |
| `search` | string | No | Search keyword to match against product titles and descriptions |
| `category` | string | No | Filter by category slug or ID |
| `tag` | string | No | Filter by tag slug or ID |

**Response:**
```json
{
  "count": 5,
  "products": [
    {
      "id": 123,
      "title": "Product Name",
      "status": "publish",
      "sku": "PROD-123",
      "pricing": { "amount": "29.00" },
      "licensing": "v1.0"
    }
  ]
}
```

**Example (search):**
```json
{ "search": "wordpress plugin", "number": 10 }
```

**Example (category filter):**
```json
{ "category": "plugins" }
```

---

### edd_get_product

Get detailed information about a specific product by ID. Returns the full EDD product object including pricing, files, licensing, stats, and categories/tags.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | number | Yes | The product ID |

**Response:**
```json
{
  "info": {
    "id": 123,
    "slug": "product-name",
    "title": "Product Name",
    "status": "publish",
    "sku": "PROD-123",
    "category": [{ "term_id": 3, "name": "ebooks", "slug": "ebooks" }],
    "tags": [{ "term_id": 7, "name": "pdf", "slug": "pdf" }],
    "create_date": "2025-01-01 00:00:00",
    "modified_date": "2025-01-15 12:00:00"
  },
  "pricing": { "amount": "29.00" },
  "files": [{ "index": "0", "name": "product-v1.0.zip", "file": "https://..." }],
  "licensing": { "enabled": true, "version": "1.0" },
  "stats": { "total": { "sales": 50, "earnings": 1450.00 } }
}
```

---

## Customers

### edd_list_customers

List customers with their purchase statistics. Uses the V2 API, which returns richer data including `date_created` and `additional_emails`. Optionally filter by creation date preset or custom date range.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `number` | number | No | Number of customers to return (default: 10) |
| `page` | number | No | Page number for pagination |
| `date` | string | No | Date preset: `today` or `yesterday` |
| `startDate` | string | No | Start date in YYYYMMDD format (requires `endDate`) |
| `endDate` | string | No | End date in YYYYMMDD format (requires `startDate`) |

**Response:**
```json
{
  "count": 10,
  "customers": [
    {
      "id": "456",
      "userId": "789",
      "email": "john@example.com",
      "name": "John Doe",
      "totalPurchases": 5,
      "totalSpent": 245.00,
      "totalDownloads": 12
    }
  ]
}
```

Note: `id` is the EDD customer ID (use with `edd_get_customer`). `userId` is the WordPress user ID when available.

**Example (today's customers):**
```json
{ "date": "today" }
```

**Example (date range):**
```json
{ "startDate": "20250101", "endDate": "20250131" }
```

---

### edd_get_customer

Get detailed customer information by EDD customerId or email. Uses V2 API with the `&customer={identifier}` param, which accepts both numeric IDs and email addresses.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | number | No | Customer ID to retrieve |
| `email` | string | No | Customer email to retrieve |

At least one of `customerId` or `email` is required.

**Response:**
```json
{
  "info": {
    "id": "456",
    "user_id": "789",
    "customer_id": "456",
    "email": "john@example.com",
    "display_name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "additional_emails": ["john.alt@example.com"],
    "date_created": "2024-06-15 10:30:00"
  },
  "stats": {
    "total_purchases": 5,
    "total_spent": 245.00,
    "total_downloads": 12
  }
}
```

**Example:**
```json
{ "customerId": 456 }
```

---

## Sales

### edd_list_sales

List recent sales/transactions with optional filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `number` | number | No | Number of sales to return (default: 10) |
| `page` | number | No | Page number for pagination |
| `email` | string | No | Filter by customer email |
| `startDate` | string | No | Start date (YYYYMMDD format) |
| `endDate` | string | No | End date (YYYYMMDD format) |

**Response:**
```json
{
  "count": 10,
  "sales": [
    {
      "id": 1234,
      "email": "customer@example.com",
      "total": 53.90,
      "date": "2025-01-15 14:30:00",
      "gateway": "stripe",
      "products": ["Product Name"],
      "hasLicenses": true,
      "discountCodes": ["SAVE10"]
    }
  ]
}
```

---

### edd_get_sale

Get detailed information about a specific sale by ID or purchase key.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `saleId` | number | No | Sale ID to retrieve |
| `purchaseKey` | string | No | Purchase key to retrieve |

At least one of `saleId` or `purchaseKey` is required.

**Response:**
```json
{
  "ID": 1234,
  "key": "abc123def456",
  "email": "customer@example.com",
  "total": 53.90,
  "subtotal": 49.00,
  "tax": 4.90,
  "date": "2025-01-15 14:30:00",
  "gateway": "stripe",
  "products": [
    { "id": 123, "name": "Product Name", "price": 49.00 }
  ],
  "licenses": [
    { "key": "license-key-here", "exp_date": "2026-01-15" }
  ],
  "discountCodes": ["SAVE10"]
}
```

**Example:**
```json
{ "saleId": 1234 }
```

---

## Discounts

### edd_list_discounts

List all discount codes with their usage statistics.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `number` | number | No | Number of discounts to return |

**Response:**
```json
{
  "count": 3,
  "discounts": [
    {
      "id": 100,
      "code": "SUMMER20",
      "name": "Summer Sale",
      "amount": "20",
      "type": "percent",
      "uses": 45,
      "maxUses": 100,
      "status": "active"
    }
  ]
}
```

---

### edd_get_discount

Get detailed information about a specific discount code by ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `discountId` | number | Yes | The discount ID |

**Response:**
```json
{
  "ID": 100,
  "name": "Summer Sale",
  "code": "SUMMER20",
  "amount": "20",
  "type": "percent",
  "uses": 45,
  "max_uses": 100,
  "start_date": "2025-06-01",
  "exp_date": "2025-08-31",
  "status": "active",
  "product_requirements": [],
  "global_discount": "1",
  "single_use": "0"
}
```

**Example:**
```json
{ "discountId": 100 }
```

---

### edd_get_discount_by_code

Look up a discount by its code string (case-insensitive). Fetches all discounts and filters client-side (EDD API does not support server-side code filtering).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | string | Yes | The discount code to look up |

**Response:** Same structure as `edd_get_discount`.

**Example:**
```json
{ "code": "SUMMER20" }
```

---

### edd_list_active_discounts

List only currently active discount codes, filtering out expired and disabled ones. Fetches discounts then filters client-side, so the returned count may be less than `number`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `number` | number | No | Number of discounts to fetch before filtering |

**Response:** Same structure as `edd_list_discounts`, but only includes discounts with `status: "active"`.

---

## Statistics

### edd_get_stats

Get earnings or sales statistics (current month, last month, and all-time totals).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | string | Yes | `sales` (count) or `earnings` (revenue) |

**Response:**
```json
{
  "type": "earnings",
  "stats": {
    "earnings": {
      "current_month": 5890.00,
      "last_month": 4750.00,
      "totals": 75000.00
    }
  }
}
```

---

### edd_get_stats_by_date

Get daily earnings or sales statistics for a custom date range.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | string | Yes | `sales` or `earnings` |
| `startDate` | string | Yes | Start date in YYYYMMDD format |
| `endDate` | string | Yes | End date in YYYYMMDD format |

**Response:**
```json
{
  "type": "earnings",
  "startDate": "20250101",
  "endDate": "20250103",
  "total": 450,
  "daily": {
    "2025-01-01": 100,
    "2025-01-02": 150,
    "2025-01-03": 200
  }
}
```

---

### edd_get_stats_by_product

Get earnings or sales statistics broken down by product.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | string | Yes | `sales` or `earnings` |
| `productId` | number | No | Specific product ID (omit for all) |

---

### edd_get_stats_by_preset

Get earnings or sales statistics using a preset date filter.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | string | Yes | `sales` or `earnings` |
| `date` | string | Yes | Date preset (see below) |

**Date Presets:**
- `today`, `yesterday`
- `this_week`, `last_week`
- `this_month`, `last_month`
- `this_quarter`, `last_quarter`
- `this_year`, `last_year`

---

## File Download Logs

### edd_get_download_logs

Get file download history, optionally filtered by product or customer.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `number` | number | No | Number of logs to return (default: 10) |
| `productId` | number | No | Filter by product ID |
| `customerId` | number | No | Filter by customer ID |

**Response:**
```json
{
  "count": 5,
  "logs": [
    {
      "id": 5000,
      "productId": 123,
      "productName": "Product Name",
      "fileName": "product-v1.0.zip",
      "date": "2025-01-20 15:45:00",
      "paymentId": 1234
    }
  ]
}
```

---

## Utility

### edd_validate_connection

Validate Store API URL and credentials by making lightweight requests.

**Parameters:** None

**Response:**
```json
{
  "ok": true,
  "checks": {
    "productsEndpoint": { "ok": true, "sampleCount": 1 },
    "authenticatedEndpoint": { "ok": true, "sampleCount": 1 }
  }
}
```

---

## Response Formats

All tool responses return JSON text content. Successful responses include a `count` field and the relevant data array. Error responses include descriptive messages with troubleshooting hints.

---

## Error Handling

### HTTP Errors

The server provides detailed diagnostic information including:
- HTTP status code and URL
- Response headers (content-type, server)
- Body snippet for debugging
- Actionable hints (e.g., Cloudflare detection, wrong URL format)

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check API key and token |
| 403 | Forbidden | User lacks permissions |
| 404 | Not Found | API URL is likely wrong (should end with `/edd-api/`) |
| 500 | Server Error | Check EDD logs on server |

### Retry Logic

The server makes up to 3 total attempts (1 initial + 2 retries) with exponential backoff delays of 1s and 2s between attempts.

---

## API Versions

### V1

Used by: sales, discounts, stats, download logs.

### V2

Used by products and customers endpoints for richer response data:
- **Products** (`edd_list_products`, `edd_get_product`): SKU field, category/tag term objects, file index/attachment_id. Supports search, category, and tag filtering.
- **Customers** (`edd_list_customers`, `edd_get_customer`): `date_created`, `additional_emails` fields. Supports date preset and date range filtering. Single customer lookup via `&customer={id_or_email}`.

V2 endpoints use the `/edd-api/v2/` path.

---

## Pagination

List endpoints support pagination via:
- **number**: Results per page (default varies by tool)
- **page**: Page number (default: 1)

Use `number: -1` to retrieve all results (use with caution on large datasets).

---

## Date Formats

### YYYYMMDD Format

Used for date range queries:
- `20250101` = January 1, 2025
- `20251231` = December 31, 2025

### Date Presets

**Statistics** (`edd_get_stats_by_preset`):
- `today`, `yesterday`
- `this_week`, `last_week`
- `this_month`, `last_month`
- `this_quarter`, `last_quarter`
- `this_year`, `last_year`

**Customers** (`edd_list_customers`):
- `today`, `yesterday`
