#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRequire } from 'node:module';
import { z } from 'zod';
import { EDDClient } from './edd-client.js';
import { loadEnv, validateEnv } from './env.js';

type PackageJson = { version: string };
const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as PackageJson;

// Load and validate environment
loadEnv();
const config = validateEnv();

// Initialize EDD client
const edd = new EDDClient(config);

// Create MCP server
const server = new McpServer({
  name: 'mcp-edd',
  version: packageJson.version,
});

// ============================================================================
// Tool 1: List Products
// ============================================================================
server.registerTool(
  'edd_list_products',
  {
    title: 'List EDD Products',
    description: 'List all products from the Easy Digital Downloads store with pricing and stats',
    inputSchema: {
      number: z.number().optional().describe('Number of products to return (default: all)'),
    },
  },
  async ({ number }) => {
    const products = await edd.listProducts({ number });

    const summary = products.map((p) => ({
      id: p.info.id,
      title: p.info.title,
      status: p.info.status,
      pricing: p.pricing,
      licensing: p.licensing?.enabled ? `v${p.licensing.version}` : null,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ count: products.length, products: summary }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Tool 2: Get Product
// ============================================================================
server.registerTool(
  'edd_get_product',
  {
    title: 'Get EDD Product',
    description: 'Get detailed information about a specific product by ID',
    inputSchema: {
      productId: z.number().describe('The product ID to retrieve'),
    },
  },
  async ({ productId }) => {
    const product = await edd.getProduct(productId);

    if (!product) {
      return {
        content: [{ type: 'text', text: `Product ${productId} not found` }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(product, null, 2) }],
    };
  }
);

// ============================================================================
// Tool 3: List Sales
// ============================================================================
server.registerTool(
  'edd_list_sales',
  {
    title: 'List EDD Sales',
    description:
      'List recent sales/transactions with optional filtering by email or date range',
    inputSchema: {
      number: z.number().optional().describe('Number of sales to return (default: 10)'),
      page: z.number().optional().describe('Page number for pagination'),
      email: z.string().optional().describe('Filter sales by customer email'),
      startDate: z.string().optional().describe('Start date (YYYYMMDD format)'),
      endDate: z.string().optional().describe('End date (YYYYMMDD format)'),
    },
  },
  async ({ number, page, email, startDate, endDate }) => {
    const sales = await edd.listSales({
      number: number ?? 10,
      page,
      email,
      startdate: startDate,
      enddate: endDate,
    });

    const summary = sales.map((s) => ({
      id: s.ID,
      email: s.email,
      total: s.total,
      date: s.date,
      gateway: s.gateway,
      products: s.products.map((p) => p.name),
      hasLicenses: (s.licenses?.length ?? 0) > 0,
      discounts: s.discounts || null,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ count: sales.length, sales: summary }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Tool 4: Get Sale
// ============================================================================
server.registerTool(
  'edd_get_sale',
  {
    title: 'Get EDD Sale',
    description: 'Get detailed information about a specific sale by ID or purchase key',
    inputSchema: {
      saleId: z.number().optional().describe('Sale ID to retrieve'),
      purchaseKey: z.string().optional().describe('Purchase key to retrieve'),
    },
  },
  async ({ saleId, purchaseKey }) => {
    if (!saleId && !purchaseKey) {
      return {
        content: [{ type: 'text', text: 'Error: Either saleId or purchaseKey is required' }],
      };
    }

    const sale = saleId
      ? await edd.getSaleById(saleId)
      : await edd.getSaleByKey(purchaseKey!);

    if (!sale) {
      return {
        content: [{ type: 'text', text: 'Sale not found' }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(sale, null, 2) }],
    };
  }
);

// ============================================================================
// Tool 5: List Customers
// ============================================================================
server.registerTool(
  'edd_list_customers',
  {
    title: 'List EDD Customers',
    description: 'List customers with their purchase statistics',
    inputSchema: {
      number: z.number().optional().describe('Number of customers to return (default: 10)'),
      page: z.number().optional().describe('Page number for pagination'),
    },
  },
  async ({ number, page }) => {
    const customers = await edd.listCustomers({ number: number ?? 10, page });

    const summary = customers.map((c) => ({
      id: c.info.id,
      email: c.info.email,
      name: c.info.display_name || `${c.info.first_name} ${c.info.last_name}`.trim(),
      totalPurchases: c.stats.total_purchases,
      totalSpent: c.stats.total_spent,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ count: customers.length, customers: summary }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Tool 6: Get Customer
// ============================================================================
server.registerTool(
  'edd_get_customer',
  {
    title: 'Get EDD Customer',
    description: 'Get detailed customer information by ID or email',
    inputSchema: {
      customerId: z.number().optional().describe('Customer ID to retrieve'),
      email: z.string().optional().describe('Customer email to retrieve'),
    },
  },
  async ({ customerId, email }) => {
    if (!customerId && !email) {
      return {
        content: [{ type: 'text', text: 'Error: Either customerId or email is required' }],
      };
    }

    const customer = customerId
      ? await edd.getCustomerById(customerId)
      : await edd.getCustomerByEmail(email!);

    if (!customer) {
      return {
        content: [{ type: 'text', text: 'Customer not found' }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(customer, null, 2) }],
    };
  }
);

// ============================================================================
// Tool 7: Get Stats
// ============================================================================
server.registerTool(
  'edd_get_stats',
  {
    title: 'Get EDD Stats',
    description:
      'Get earnings or sales statistics (current month, last month, and all-time totals)',
    inputSchema: {
      type: z.enum(['sales', 'earnings']).describe('Type of stats: sales (count) or earnings (revenue)'),
    },
  },
  async ({ type }) => {
    const stats = await edd.getStats(type);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ type, stats }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Tool 8: Get Stats by Date Range
// ============================================================================
server.registerTool(
  'edd_get_stats_by_date',
  {
    title: 'Get EDD Stats by Date Range',
    description: 'Get daily earnings or sales statistics for a custom date range',
    inputSchema: {
      type: z.enum(['sales', 'earnings']).describe('Type of stats: sales (count) or earnings (revenue)'),
      startDate: z.string().describe('Start date in YYYYMMDD format (e.g., 20250101)'),
      endDate: z.string().describe('End date in YYYYMMDD format (e.g., 20250131)'),
    },
  },
  async ({ type, startDate, endDate }) => {
    const stats = await edd.getStatsByDateRange(type, startDate, endDate);

    // Calculate total
    const total = Object.values(stats).reduce((sum, val) => sum + val, 0);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ type, startDate, endDate, total, daily: stats }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Tool 9: Get Stats by Product
// ============================================================================
server.registerTool(
  'edd_get_stats_by_product',
  {
    title: 'Get EDD Stats by Product',
    description: 'Get earnings or sales statistics broken down by product',
    inputSchema: {
      type: z.enum(['sales', 'earnings']).describe('Type of stats: sales (count) or earnings (revenue)'),
      productId: z.number().optional().describe('Specific product ID (omit for all products)'),
    },
  },
  async ({ type, productId }) => {
    const stats = await edd.getStatsByProduct(type, productId);

    // Calculate total
    const total = stats.reduce((sum, item) => sum + item.value, 0);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ type, productId: productId ?? 'all', total, products: stats }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Tool 10: List Discounts
// ============================================================================
server.registerTool(
  'edd_list_discounts',
  {
    title: 'List EDD Discounts',
    description: 'List all discount codes with their usage statistics',
    inputSchema: {
      number: z.number().optional().describe('Number of discounts to return'),
    },
  },
  async ({ number }) => {
    const discounts = await edd.listDiscounts({ number });

    const summary = discounts.map((d) => ({
      id: d.ID,
      code: d.code,
      name: d.name,
      amount: d.amount,
      type: d.type,
      uses: d.uses,
      maxUses: d.max_uses,
      status: d.status,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ count: discounts.length, discounts: summary }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Tool 11: Get Discount
// ============================================================================
server.registerTool(
  'edd_get_discount',
  {
    title: 'Get EDD Discount',
    description: 'Get detailed information about a specific discount code',
    inputSchema: {
      discountId: z.number().describe('The discount ID to retrieve'),
    },
  },
  async ({ discountId }) => {
    const discount = await edd.getDiscount(discountId);

    if (!discount) {
      return {
        content: [{ type: 'text', text: `Discount ${discountId} not found` }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(discount, null, 2) }],
    };
  }
);

// ============================================================================
// Tool 12: Get Download Logs
// ============================================================================
server.registerTool(
  'edd_get_download_logs',
  {
    title: 'Get EDD Download Logs',
    description: 'Get file download history, optionally filtered by product or customer',
    inputSchema: {
      number: z.number().optional().describe('Number of logs to return (default: 10)'),
      productId: z.number().optional().describe('Filter by product ID'),
      customerId: z.number().optional().describe('Filter by customer ID'),
    },
  },
  async ({ number, productId, customerId }) => {
    const logs = await edd.getDownloadLogs({
      number: number ?? 10,
      product: productId,
      customer: customerId,
    });

    const summary = logs.map((log) => ({
      id: log.ID,
      productId: log.product_id,
      productName: log.product_name,
      fileName: log.file_name,
      date: log.date,
      paymentId: log.payment_id,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ count: logs.length, logs: summary }, null, 2),
        },
      ],
    };
  }
);

// ============================================================================
// Start Server
// ============================================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
