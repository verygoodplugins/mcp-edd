#!/usr/bin/env node
import './stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRequire } from 'node:module';
import { z } from 'zod';
import { EDDClient, EDDHttpError } from './edd-client.js';
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
  name: 'io.github.verygoodplugins/mcp-edd',
  version: packageJson.version,
});

// ============================================================================
// Tool 1: List Products
// ============================================================================
server.registerTool(
  'edd_list_products',
  {
    title: 'List EDD Products',
    description:
      'List products from the Easy Digital Downloads store with pricing, stats, and SKU. ' +
      'Optionally search by keyword, filter by category slug/ID, or filter by tag slug/ID. ' +
      'Category and tag filters can be combined.',
    inputSchema: {
      number: z.number().optional().describe('Number of products to return (default: all)'),
      search: z.string().optional().describe('Search keyword to match against product titles and descriptions'),
      category: z.string().optional().describe('Filter by category slug or ID'),
      tag: z.string().optional().describe('Filter by tag slug or ID'),
    },
  },
  async ({ number, search, category, tag }) => {
    const products = await edd.listProducts({ number, search, category, tag });

    const summary = products.map((p) => ({
      id: p.info.id,
      title: p.info.title,
      status: p.info.status,
      sku: p.info.sku ?? null,
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
      discountCodes: (() => {
        const raw = (s as unknown as { discount?: unknown }).discount ?? s.discounts ?? null;
        if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string');
        if (typeof raw === 'string' && raw.trim().length > 0) return [raw];
        return null;
      })(),
      id: s.ID,
      email: s.email,
      total: s.total,
      date: s.date,
      gateway: s.gateway,
      products: s.products.map((p) => p.name),
      hasLicenses: (s.licenses?.length ?? 0) > 0,
      // Back-compat: older clients look for `discounts`.
      discounts: (() => {
        const raw = (s as unknown as { discount?: unknown }).discount ?? s.discounts ?? null;
        if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string');
        if (typeof raw === 'string' && raw.trim().length > 0) return [raw];
        return null;
      })(),
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

    const discountCodes = (() => {
      const raw =
        (sale as unknown as { discount?: unknown }).discount ?? sale.discounts ?? null;
      if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string');
      if (typeof raw === 'string' && raw.trim().length > 0) return [raw];
      return null;
    })();

    return {
      content: [{ type: 'text', text: JSON.stringify({ ...sale, discountCodes }, null, 2) }],
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
    description:
      'List customers with their purchase statistics (date_created, additional_emails included). ' +
      'Optionally filter by creation date preset (today/yesterday) or a custom date range in YYYYMMDD format.',
    inputSchema: {
      number: z.number().optional().describe('Number of customers to return (default: 10)'),
      page: z.number().optional().describe('Page number for pagination'),
      date: z.enum(['today', 'yesterday']).optional().describe('Filter by creation date preset'),
      startDate: z.string().optional().describe('Start date in YYYYMMDD format (requires endDate)'),
      endDate: z.string().optional().describe('End date in YYYYMMDD format (requires startDate)'),
    },
  },
  async ({ number, page, date, startDate, endDate }) => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      return {
        content: [{ type: 'text', text: 'Error: Both startDate and endDate are required when using date range filtering' }],
      };
    }

    const customers = await edd.listCustomers({
      number: number ?? 10,
      page,
      date,
      startdate: startDate,
      enddate: endDate,
    });

    const summary = customers.map((c) => ({
      // `id` is the EDD customer ID to use with edd_get_customer(customerId).
      id: c.info.customer_id ?? c.info.id,
      userId: c.info.user_id ?? null,
      email: c.info.email,
      name: c.info.display_name || `${c.info.first_name ?? ''} ${c.info.last_name ?? ''}`.trim(),
      totalPurchases: c.stats.total_purchases,
      totalSpent: c.stats.total_spent,
      totalDownloads: c.stats.total_downloads,
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
    description:
      'Get detailed customer information by EDD customerId or email. Returns full customer data including date_created and additional_emails.',
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
// Tool 13: Validate Connection
// ============================================================================
server.registerTool(
  'edd_validate_connection',
  {
    title: 'Validate EDD Connection',
    description:
      'Validate Store API URL and credentials by making lightweight requests (products + one authenticated endpoint).',
    inputSchema: {},
  },
  async () => {
    try {
      const products = await edd.listProducts({ number: 1 });
      const sales = await edd.listSales({ number: 1 });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                checks: {
                  productsEndpoint: { ok: true, sampleCount: products.length },
                  authenticatedEndpoint: { ok: true, sampleCount: sales.length },
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const message =
        error instanceof EDDHttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text:
              'Connection validation failed.\n\n' +
              message +
              '\n\n' +
              'Common fixes:\n' +
              '- Store API URL must be the EDD endpoint and typically ends with `/edd-api/`\n' +
              '- Confirm Downloads → Settings → API is enabled and your key/token are correct\n' +
              '- If the response is HTML/Cloudflare, allowlist `/edd-api/*`',
          },
        ],
      };
    }
  }
);

// ============================================================================
// Tool 14: Get Discount by Code
// ============================================================================
server.registerTool(
  'edd_get_discount_by_code',
  {
    title: 'Get EDD Discount by Code',
    description: 'Look up a discount by its code string (case-insensitive)',
    inputSchema: {
      code: z.string().describe('The discount code to look up (case-insensitive)'),
    },
  },
  async ({ code }) => {
    const discount = await edd.getDiscountByCode(code);

    if (!discount) {
      return {
        content: [{ type: 'text', text: `Discount with code "${code}" not found` }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(discount, null, 2) }],
    };
  }
);

// ============================================================================
// Tool 16: List Active Discounts
// ============================================================================
server.registerTool(
  'edd_list_active_discounts',
  {
    title: 'List Active EDD Discounts',
    description: 'List only currently active discount codes, filtering out expired and disabled ones',
    inputSchema: {
      number: z.number().optional().describe('Number of discounts to return'),
    },
  },
  async ({ number }) => {
    const discounts = await edd.listActiveDiscounts({ number });

    const summary = discounts.map((d) => ({
      id: d.ID,
      code: d.code,
      name: d.name,
      amount: d.amount,
      type: d.type,
      uses: d.uses,
      maxUses: d.max_uses,
      startDate: d.start_date,
      expDate: d.exp_date,
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
// Tool 17: Get Stats by Preset
// ============================================================================
server.registerTool(
  'edd_get_stats_by_preset',
  {
    title: 'Get EDD Stats by Date Preset',
    description:
      'Get earnings or sales statistics using a preset date filter (today, yesterday, this_week, this_month, etc.)',
    inputSchema: {
      type: z.enum(['sales', 'earnings']).describe('Type of stats: sales (count) or earnings (revenue)'),
      date: z.enum([
        'today', 'yesterday',
        'this_week', 'last_week',
        'this_month', 'last_month',
        'this_quarter', 'last_quarter',
        'this_year', 'last_year',
      ]).describe('Predefined date filter'),
    },
  },
  async ({ type, date }) => {
    const stats = await edd.getStatsByPreset(type, date);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ type, date, stats }, null, 2),
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
