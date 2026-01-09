# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-09

### Added

- Initial release
- 12 MCP tools covering all EDD REST API endpoints:
  - `edd_list_products` - List products with pricing
  - `edd_get_product` - Get product by ID
  - `edd_list_sales` - List sales with filters
  - `edd_get_sale` - Get sale by ID or purchase key
  - `edd_list_customers` - List customers with stats
  - `edd_get_customer` - Get customer by ID or email
  - `edd_get_stats` - Get earnings/sales totals
  - `edd_get_stats_by_date` - Get stats for date range
  - `edd_get_stats_by_product` - Get stats by product
  - `edd_list_discounts` - List discount codes
  - `edd_get_discount` - Get discount details
  - `edd_get_download_logs` - Get file download logs
- Unit tests with mocked fetch
- Integration tests against live API
- TypeScript with Zod validation
- Exponential backoff retry logic
