# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/verygoodplugins/mcp-edd/compare/mcp-edd-v1.0.0...mcp-edd-v1.1.0) (2026-02-17)


### Features

* harden API client, align with mcp-ecosystem standards ([#15](https://github.com/verygoodplugins/mcp-edd/issues/15)) ([0b26505](https://github.com/verygoodplugins/mcp-edd/commit/0b265056d23cae97a662f96f37a19523572d56cf))
* initial release of mcp-edd ([081e3d0](https://github.com/verygoodplugins/mcp-edd/commit/081e3d0e793032b6fcf026a795e4c57d2f1ed845))


### Bug Fixes

* update Jest CLI flags for Jest 30 compatibility ([#17](https://github.com/verygoodplugins/mcp-edd/issues/17)) ([89f76c5](https://github.com/verygoodplugins/mcp-edd/commit/89f76c5c9f1e493daaf66c00778c5288d104f4bb))
* use RELEASE_PLEASE_TOKEN so PR triggers CI checks ([#18](https://github.com/verygoodplugins/mcp-edd/issues/18)) ([8047daa](https://github.com/verygoodplugins/mcp-edd/commit/8047daa9f1682f3bb943616ff255541d51125d73))

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
