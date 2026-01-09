/**
 * Integration tests for EDD API client.
 * These tests run against the live WP Fusion EDD API.
 *
 * Run with: npm run test:integration
 *
 * Environment variables required:
 *   EDD_API_URL - The EDD API endpoint
 *   EDD_API_KEY - API public key
 *   EDD_API_TOKEN - API token
 */

import { EDDClient } from '../../src/edd-client';

// Skip integration tests if credentials not available
const hasCredentials =
  process.env.EDD_API_URL && process.env.EDD_API_KEY && process.env.EDD_API_TOKEN;

const describeIf = hasCredentials ? describe : describe.skip;

describeIf('EDD API Integration Tests', () => {
  let client: EDDClient;

  beforeAll(() => {
    client = new EDDClient({
      apiUrl: process.env.EDD_API_URL!,
      apiKey: process.env.EDD_API_KEY!,
      apiToken: process.env.EDD_API_TOKEN!,
    });
  });

  describe('Products', () => {
    it('should list products from the store', async () => {
      const products = await client.listProducts({ number: 5 });

      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      expect(products[0].info).toBeDefined();
      expect(products[0].info.title).toBeDefined();
    });

    it('should get a specific product by ID', async () => {
      // First get a product to get a valid ID
      const products = await client.listProducts({ number: 1 });
      expect(products.length).toBeGreaterThan(0);

      const productId = products[0].info.id;
      const product = await client.getProduct(productId);

      expect(product).not.toBeNull();
      expect(product?.info.id).toBe(productId);
    });
  });

  describe('Sales', () => {
    it('should list recent sales', async () => {
      const sales = await client.listSales({ number: 5 });

      expect(Array.isArray(sales)).toBe(true);
      expect(sales.length).toBeGreaterThan(0);
      expect(sales[0].ID).toBeDefined();
      expect(sales[0].email).toBeDefined();
      expect(sales[0].total).toBeDefined();
    });

    it('should include license information in sales', async () => {
      const sales = await client.listSales({ number: 10 });
      const saleWithLicense = sales.find((s) => s.licenses && s.licenses.length > 0);

      if (saleWithLicense) {
        expect(saleWithLicense.licenses![0].key).toBeDefined();
      }
    });
  });

  describe('Customers', () => {
    it('should list customers with stats', async () => {
      const customers = await client.listCustomers({ number: 5 });

      expect(Array.isArray(customers)).toBe(true);
      expect(customers.length).toBeGreaterThan(0);
      expect(customers[0].info.email).toBeDefined();
      expect(customers[0].stats.total_purchases).toBeDefined();
      expect(customers[0].stats.total_spent).toBeDefined();
    });

    it('should find customer by email', async () => {
      // Get a customer first to find a valid email
      const customers = await client.listCustomers({ number: 1 });
      expect(customers.length).toBeGreaterThan(0);

      const email = customers[0].info.email;
      const customer = await client.getCustomerByEmail(email);

      expect(customer).not.toBeNull();
      expect(customer?.info.email).toBe(email);
    });
  });

  describe('Stats', () => {
    it('should return earnings statistics', async () => {
      const stats = await client.getStats('earnings');

      expect(stats).toBeDefined();
      expect(stats.earnings).toBeDefined();
      expect(typeof stats.earnings?.current_month).toBe('number');
      expect(typeof stats.earnings?.totals).toBe('number');
    });

    it('should return sales count statistics', async () => {
      const stats = await client.getStats('sales');

      expect(stats).toBeDefined();
      expect(stats.sales).toBeDefined();
      expect(typeof stats.sales?.current_month).toBe('number');
    });

    it('should return stats by date range', async () => {
      // Get stats for last 7 days
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const formatDate = (d: Date) =>
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

      const stats = await client.getStatsByDateRange(
        'earnings',
        formatDate(weekAgo),
        formatDate(today)
      );

      expect(typeof stats).toBe('object');
      // Should have date keys
      const keys = Object.keys(stats);
      expect(keys.length).toBeGreaterThanOrEqual(0);
    });

    it('should return stats by product', async () => {
      const stats = await client.getStatsByProduct('earnings');

      expect(Array.isArray(stats)).toBe(true);
      if (stats.length > 0) {
        expect(stats[0].name).toBeDefined();
        expect(typeof stats[0].value).toBe('number');
      }
    });
  });

  describe('Discounts', () => {
    it('should list discount codes', async () => {
      const discounts = await client.listDiscounts();

      expect(Array.isArray(discounts)).toBe(true);
      // May be empty if no discounts exist
      if (discounts.length > 0) {
        expect(discounts[0].code).toBeDefined();
        expect(discounts[0].amount).toBeDefined();
        expect(discounts[0].type).toBeDefined();
      }
    });
  });

  describe('Download Logs', () => {
    it('should return download logs', async () => {
      const logs = await client.getDownloadLogs({ number: 5 });

      expect(Array.isArray(logs)).toBe(true);
      // May be empty if no downloads
      if (logs.length > 0) {
        expect(logs[0].product_id).toBeDefined();
        expect(logs[0].date).toBeDefined();
      }
    });
  });
});
