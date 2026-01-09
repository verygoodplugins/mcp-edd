import { z } from 'zod';

// ============================================================================
// EDD API Response Types
// ============================================================================

// Product types
export const ProductInfoSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  create_date: z.string(),
  modified_date: z.string(),
  status: z.string(),
  link: z.string().optional(),
  permalink: z.string().optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  thumbnail: z.union([z.string(), z.boolean()]).optional(),
  category: z.union([z.string(), z.union([z.boolean(), z.array(z.string())])]).optional(),
  tags: z.union([z.string(), z.union([z.boolean(), z.array(z.string())])]).optional(),
});

export const ProductPricingSchema = z.record(z.string(), z.string());

export const ProductLicensingSchema = z.object({
  enabled: z.boolean(),
  version: z.string().optional(),
  exp_unit: z.string().optional(),
  exp_length: z.number().optional(),
});

export const ProductSchema = z.object({
  info: ProductInfoSchema,
  pricing: ProductPricingSchema.optional(),
  licensing: ProductLicensingSchema.optional(),
  stats: z
    .object({
      total: z
        .object({
          sales: z.number().optional(),
          earnings: z.number().optional(),
        })
        .optional(),
      monthly_average: z
        .object({
          sales: z.number().optional(),
          earnings: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  files: z
    .array(
      z.object({
        name: z.string(),
        file: z.string(),
        condition: z.union([z.string(), z.number()]),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

export const ProductsResponseSchema = z.object({
  products: z.array(ProductSchema),
  request_speed: z.number().optional(),
});

// Customer types
export const CustomerInfoSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  username: z.string().optional(),
  display_name: z.string().optional(),
  customer_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string(),
});

export const CustomerStatsSchema = z.object({
  total_purchases: z.number(),
  total_spent: z.number(),
  total_downloads: z.number().optional(),
});

export const CustomerSchema = z.object({
  info: CustomerInfoSchema,
  stats: CustomerStatsSchema,
});

export const CustomersResponseSchema = z.object({
  customers: z.array(CustomerSchema),
  request_speed: z.number().optional(),
});

// Sales/Payment types
export const SaleProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number().optional(),
  price_name: z.string().optional(),
  quantity: z.number().optional(),
});

export const SaleLicenseSchema = z.object({
  key: z.string(),
  is_local: z.boolean().optional(),
  exp_date: z.string().optional(),
  sites: z.union([z.array(z.string()), z.record(z.string(), z.string())]).optional(),
});

export const SaleSchema = z.object({
  ID: z.number(),
  key: z.string().optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  fees: z.any().optional(),
  total: z.number(),
  gateway: z.string().optional(),
  email: z.string(),
  date: z.string(),
  products: z.array(SaleProductSchema),
  discounts: z.union([z.string(), z.union([z.array(z.string()), z.null()])]).optional(),
  licenses: z.array(SaleLicenseSchema).optional(),
});

export const SalesResponseSchema = z.object({
  sales: z.array(SaleSchema),
  request_speed: z.number().optional(),
});

// Stats types
export const StatsResponseSchema = z.object({
  stats: z.object({
    sales: z
      .object({
        current_month: z.number().optional(),
        last_month: z.number().optional(),
        totals: z.number().optional(),
      })
      .optional(),
    earnings: z
      .object({
        current_month: z.number().optional(),
        last_month: z.number().optional(),
        totals: z.number().optional(),
      })
      .optional(),
  }),
  request_speed: z.number().optional(),
});

export const DateRangeStatsSchema = z.object({
  sales: z.record(z.string(), z.number()).optional(),
  earnings: z.record(z.string(), z.number()).optional(),
  totals: z.number().optional(),
});

// Discount types
export const DiscountSchema = z.object({
  ID: z.number(),
  name: z.string(),
  code: z.string(),
  amount: z.string(),
  min_price: z.string().optional(),
  type: z.string(),
  uses: z.number(),
  max_uses: z.number().optional(),
  start_date: z.string().optional(),
  exp_date: z.string().optional(),
  status: z.string(),
  product_requirements: z.array(z.number()).optional(),
  requirement_condition: z.string().optional(),
  global_discount: z.string().optional(),
  single_use: z.string().optional(),
});

export const DiscountsResponseSchema = z.object({
  discounts: z.array(DiscountSchema),
  request_speed: z.number().optional(),
});

// Download log types
export const DownloadLogSchema = z.object({
  ID: z.number(),
  user_id: z.number(),
  product_id: z.number(),
  product_name: z.string(),
  file_id: z.string(),
  file_name: z.string().optional(),
  ip: z.string().optional(),
  payment_id: z.number(),
  date: z.string(),
});

export const DownloadLogsResponseSchema = z.object({
  download_logs: z.array(DownloadLogSchema).optional(),
  request_speed: z.number().optional(),
});

// Error response
export const ErrorResponseSchema = z.object({
  error: z.string(),
});

// ============================================================================
// TypeScript types derived from Zod schemas
// ============================================================================

export type Product = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type CustomersResponse = z.infer<typeof CustomersResponseSchema>;
export type Sale = z.infer<typeof SaleSchema>;
export type SalesResponse = z.infer<typeof SalesResponseSchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
export type Discount = z.infer<typeof DiscountSchema>;
export type DiscountsResponse = z.infer<typeof DiscountsResponseSchema>;
export type DownloadLog = z.infer<typeof DownloadLogSchema>;
export type DownloadLogsResponse = z.infer<typeof DownloadLogsResponseSchema>;

// ============================================================================
// Tool Input Schemas (for MCP tool definitions)
// ============================================================================

export const ListProductsInputSchema = z.object({
  product: z.number().optional().describe('Specific product ID to retrieve'),
  number: z.number().optional().describe('Number of products to return (default: 10)'),
});

export const GetProductInputSchema = z.object({
  productId: z.number().describe('The product ID to retrieve'),
});

export const ListSalesInputSchema = z.object({
  number: z.number().optional().describe('Number of sales to return (default: 10)'),
  page: z.number().optional().describe('Page number for pagination'),
  email: z.string().optional().describe('Filter sales by customer email'),
  startDate: z.string().optional().describe('Start date (YYYYMMDD format)'),
  endDate: z.string().optional().describe('End date (YYYYMMDD format)'),
});

export const GetSaleInputSchema = z.object({
  saleId: z.number().optional().describe('Sale ID to retrieve'),
  purchaseKey: z.string().optional().describe('Purchase key to retrieve'),
});

export const ListCustomersInputSchema = z.object({
  number: z.number().optional().describe('Number of customers to return (default: 10)'),
  page: z.number().optional().describe('Page number for pagination'),
});

export const GetCustomerInputSchema = z.object({
  customerId: z.number().optional().describe('Customer ID to retrieve'),
  email: z.string().optional().describe('Customer email to retrieve'),
});

export const GetStatsInputSchema = z.object({
  type: z.enum(['sales', 'earnings']).describe('Type of stats to retrieve'),
  date: z
    .enum(['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year'])
    .optional()
    .describe('Predefined date filter'),
});

export const GetStatsByDateInputSchema = z.object({
  type: z.enum(['sales', 'earnings']).describe('Type of stats to retrieve'),
  startDate: z.string().describe('Start date (YYYYMMDD format)'),
  endDate: z.string().describe('End date (YYYYMMDD format)'),
});

export const GetStatsByProductInputSchema = z.object({
  type: z.enum(['sales', 'earnings']).describe('Type of stats to retrieve'),
  productId: z.number().optional().describe('Product ID (omit for all products)'),
});

export const ListDiscountsInputSchema = z.object({
  number: z.number().optional().describe('Number of discounts to return'),
});

export const GetDiscountInputSchema = z.object({
  discountId: z.number().describe('Discount ID to retrieve'),
});

export const GetDownloadLogsInputSchema = z.object({
  number: z.number().optional().describe('Number of logs to return (default: 10)'),
  productId: z.number().optional().describe('Filter by product ID'),
  customerId: z.number().optional().describe('Filter by customer ID'),
});
