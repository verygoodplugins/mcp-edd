import { EDDClient, type EDDClientConfig } from '../../src/edd-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('EDDClient', () => {
  let client: EDDClient;
  const config: EDDClientConfig = {
    apiUrl: 'https://example.com/edd-api/',
    apiKey: 'test-key',
    apiToken: 'test-token',
  };

  beforeEach(() => {
    client = new EDDClient(config);
    mockFetch.mockReset();
  });

  describe('URL building', () => {
    it('should build authenticated URLs correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: [] }),
      });

      await client.listCustomers({ number: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('key=test-key'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('token=test-token'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('number=5'),
        expect.any(Object)
      );
    });

    it('should use V2 URL with auth for products', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await client.listProducts({ number: 3 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/products/');
      expect(calledUrl).toContain('key=test-key');
      expect(calledUrl).toContain('token=test-token');
      expect(calledUrl).toContain('number=3');
    });
  });

  describe('listProducts', () => {
    it('should return products array when API returns array', async () => {
      const mockProducts = [
        {
          info: { id: 1, slug: 'test', title: 'Test Product', create_date: '', modified_date: '', status: 'publish' },
          pricing: { amount: '99.00' },
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts }),
      });

      const products = await client.listProducts();

      expect(products).toHaveLength(1);
      expect(products[0].info.title).toBe('Test Product');
    });

    it('should normalize numeric-keyed object to array (V2 behavior)', async () => {
      const mockProducts = {
        '1': {
          info: { id: 42, slug: 'product-a', title: 'Product A', create_date: '', modified_date: '', status: 'publish' },
          pricing: { amount: '10.00' },
        },
        '2': {
          info: { id: 43, slug: 'product-b', title: 'Product B', create_date: '', modified_date: '', status: 'publish' },
          pricing: { amount: '20.00' },
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts }),
      });

      const products = await client.listProducts();

      expect(products).toHaveLength(2);
      expect(products[0].info.title).toBe('Product A');
      expect(products[1].info.title).toBe('Product B');
    });
  });

  describe('getProduct', () => {
    it('should return single product when found', async () => {
      const mockProduct = {
        info: { id: 42, slug: 'wp-fusion', title: 'WP Fusion', create_date: '', modified_date: '', status: 'publish' },
        pricing: { personal: '297.00' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [mockProduct] }),
      });

      const product = await client.getProduct(42);

      expect(product).not.toBeNull();
      expect(product?.info.id).toBe(42);
    });

    it('should return null when product not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      const product = await client.getProduct(9999);

      expect(product).toBeNull();
    });
  });

  describe('listSales', () => {
    it('should return sales array with optional filters', async () => {
      const mockSales = [
        {
          ID: 1,
          key: 'abc123',
          total: 297,
          email: 'test@example.com',
          date: '2025-01-01',
          products: [{ id: 1, name: 'WP Fusion' }],
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sales: mockSales }),
      });

      const sales = await client.listSales({ number: 10, email: 'test@example.com' });

      expect(sales).toHaveLength(1);
      expect(sales[0].total).toBe(297);
    });
  });

  describe('getSaleById', () => {
    it('should return sale by ID', async () => {
      const mockSale = {
        ID: 123,
        key: 'purchase-key',
        total: 647,
        email: 'buyer@example.com',
        date: '2025-01-01',
        products: [],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sales: [mockSale] }),
      });

      const sale = await client.getSaleById(123);

      expect(sale?.ID).toBe(123);
    });
  });

  describe('listCustomers', () => {
    it('should use V2 URL and return customers with pagination', async () => {
      const mockCustomers = [
        {
          info: { id: '1', email: 'customer@test.com', date_created: '2025-01-01 10:00:00', additional_emails: [] },
          stats: { total_purchases: 3, total_spent: 500, total_downloads: 10 },
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: mockCustomers }),
      });

      const customers = await client.listCustomers({ number: 10, page: 1 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/customers/');
      expect(customers).toHaveLength(1);
      expect(customers[0].stats.total_spent).toBe(500);
    });

    it('should include date param for date preset filtering', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: [] }),
      });

      await client.listCustomers({ date: 'today' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/customers/');
      expect(calledUrl).toContain('date=today');
    });

    it('should include date range params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: [] }),
      });

      await client.listCustomers({ startdate: '20250101', enddate: '20250131' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/customers/');
      expect(calledUrl).toContain('date=range');
      expect(calledUrl).toContain('startdate=20250101');
      expect(calledUrl).toContain('enddate=20250131');
    });
  });

  describe('getCustomerById', () => {
    it('should use V2 customer param to find by ID', async () => {
      // V2 returns customer_id, not id
      const mockCustomer = {
        info: { customer_id: '1', email: 'found@example.com', date_created: '2025-01-01' },
        stats: { total_purchases: 5, total_spent: 1000 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: [mockCustomer] }),
      });

      const customer = await client.getCustomerById(1);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/customers/');
      expect(calledUrl).toContain('customer=1');
      expect(customer?.info.email).toBe('found@example.com');
      expect(customer?.info.customer_id).toBe('1');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCustomerByEmail', () => {
    it('should use V2 customer param to find by email', async () => {
      const mockCustomer = {
        info: { id: '42', email: 'found@example.com', display_name: 'Found User' },
        stats: { total_purchases: 5, total_spent: 1000 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: [mockCustomer] }),
      });

      const customer = await client.getCustomerByEmail('found@example.com');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/customers/');
      expect(calledUrl).toContain('customer=found%40example.com');
      expect(customer?.info.email).toBe('found@example.com');
    });
  });

  describe('getStats', () => {
    it('should return earnings stats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stats: {
            earnings: { current_month: 5000, last_month: 4500, totals: 100000 },
          },
        }),
      });

      const stats = await client.getStats('earnings');

      expect(stats.earnings?.current_month).toBe(5000);
      expect(stats.earnings?.totals).toBe(100000);
    });

    it('should return sales stats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stats: {
            sales: { current_month: 50, last_month: 45, totals: 1000 },
          },
        }),
      });

      const stats = await client.getStats('sales');

      expect(stats.sales?.current_month).toBe(50);
    });
  });

  describe('getStatsByDateRange', () => {
    it('should return daily stats for date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          '2025-01-01': 100,
          '2025-01-02': 150,
          '2025-01-03': 200,
          request_speed: 0.01,
          totals: 450,
        }),
      });

      const stats = await client.getStatsByDateRange('earnings', '20250101', '20250103');

      expect(stats['2025-01-01']).toBe(100);
      expect(stats['2025-01-02']).toBe(150);
      expect(stats['request_speed']).toBeUndefined();
    });

    it('should coerce object values and drop out-of-range days', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          '2025-09-30': { earnings: '10.5' },
          '2025-10-01': { earnings: '20.25' },
          '2025-10-02': { earnings: 30 },
          request_speed: 0.01,
          totals: { earnings: '60.75' },
        }),
      });

      const stats = await client.getStatsByDateRange('earnings', '20251001', '20251002');

      expect(stats['2025-09-30']).toBeUndefined();
      expect(stats['2025-10-01']).toBeCloseTo(20.25);
      expect(stats['2025-10-02']).toBe(30);
    });
  });

  describe('listDiscounts', () => {
    it('should return discount codes', async () => {
      const mockDiscounts = [
        {
          ID: 1,
          name: 'Holiday Sale',
          code: 'HOLIDAY25',
          amount: '25',
          type: 'percent',
          uses: 50,
          status: 'active',
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ discounts: mockDiscounts }),
      });

      const discounts = await client.listDiscounts();

      expect(discounts).toHaveLength(1);
      expect(discounts[0].code).toBe('HOLIDAY25');
    });
  });

  describe('getStatsByProduct', () => {
    it('should coerce string values and support nested products object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: {
            'Product A': '12',
            'Product B': { earnings: '34.5' },
          },
          request_speed: 0.01,
        }),
      });

      const stats = await client.getStatsByProduct('earnings');

      expect(stats).toEqual(
        expect.arrayContaining([
          { name: 'Product A', value: 12 },
          { name: 'Product B', value: 34.5 },
        ])
      );
    });
  });

  describe('error handling', () => {
    it('should throw on HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: () => null },
        text: async () => '',
      }).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: () => null },
        text: async () => '',
      }).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: () => null },
        text: async () => '',
      });

      await expect(client.listCustomers()).rejects.toThrow('HTTP 401');
    });

    it('should throw on API-level errors', async () => {
      // Need 3 mocks because of retry logic (but it will throw on first success with error)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'Invalid API key' }),
      });

      await expect(client.listCustomers()).rejects.toThrow('EDD API Error: Invalid API key');
    });

    it('should treat "No X found!" as empty results, not errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'No customers found!' }),
      });

      const customers = await client.listCustomers();

      expect(customers).toEqual([]);
    });

    it('should include helpful hints for 404 HTML responses', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: {
            get: (key: string) =>
              key.toLowerCase() === 'content-type'
                ? 'text/html'
                : key.toLowerCase() === 'server'
                  ? 'cloudflare'
                  : null,
          },
          text: async () => '<html><title>Not Found</title>cloudflare</html>',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: {
            get: (key: string) =>
              key.toLowerCase() === 'content-type'
                ? 'text/html'
                : key.toLowerCase() === 'server'
                  ? 'cloudflare'
                  : null,
          },
          text: async () => '<html><title>Not Found</title>cloudflare</html>',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: {
            get: (key: string) =>
              key.toLowerCase() === 'content-type'
                ? 'text/html'
                : key.toLowerCase() === 'server'
                  ? 'cloudflare'
                  : null,
          },
          text: async () => '<html><title>Not Found</title>cloudflare</html>',
        });

      try {
        await client.listCustomers({ number: 1 });
        throw new Error('Expected request to fail');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toMatch(/\/edd-api\//);
        expect(message).toMatch(/Cloudflare/i);
      }
    }, 10000);

    it('should retry on failure with exponential backoff', async () => {
      mockFetch.mockClear();
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: [] }),
        });

      const products = await client.listProducts();

      expect(products).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  // ===========================================================================
  // V2 API Tests
  // ===========================================================================

  describe('listProducts with filtering', () => {
    it('should include search param mapped to s', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await client.listProducts({ search: 'wordpress plugin' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/products/');
      expect(calledUrl).toContain('s=wordpress+plugin');
    });

    it('should return matching products from search', async () => {
      const mockProducts = [
        {
          info: { id: 1, slug: 'wp-fusion', title: 'WP Fusion', create_date: '', modified_date: '', status: 'publish' },
          pricing: { amount: '297.00' },
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: mockProducts }),
      });

      const products = await client.listProducts({ search: 'fusion' });

      expect(products).toHaveLength(1);
      expect(products[0].info.title).toBe('WP Fusion');
    });

    it('should include category param', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await client.listProducts({ category: 'plugins' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/products/');
      expect(calledUrl).toContain('category=plugins');
    });

    it('should include tag param', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await client.listProducts({ tag: 'premium' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/products/');
      expect(calledUrl).toContain('tag=premium');
    });

    it('should combine category and tag params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await client.listProducts({ category: 'ebooks', tag: 'pdf' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/products/');
      expect(calledUrl).toContain('category=ebooks');
      expect(calledUrl).toContain('tag=pdf');
    });

    it('should pass product param for single product lookup', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await client.listProducts({ product: 55 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/v2/products/');
      expect(calledUrl).toContain('product=55');
    });
  });


  describe('getDiscountByCode', () => {
    it('should find discount by code (case-insensitive)', async () => {
      const mockDiscounts = [
        { ID: 1, name: 'Holiday Sale', code: 'HOLIDAY25', amount: '25', type: 'percent', uses: 50, status: 'active' },
        { ID: 2, name: 'Summer Sale', code: 'SUMMER10', amount: '10', type: 'percent', uses: 20, status: 'active' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ discounts: mockDiscounts }),
      });

      const discount = await client.getDiscountByCode('holiday25');

      expect(discount).not.toBeNull();
      expect(discount?.code).toBe('HOLIDAY25');
    });

    it('should return null when code not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ discounts: [] }),
      });

      const discount = await client.getDiscountByCode('NONEXISTENT');

      expect(discount).toBeNull();
    });
  });

  describe('listActiveDiscounts', () => {
    it('should filter to only active discounts', async () => {
      const mockDiscounts = [
        { ID: 1, name: 'Active', code: 'ACTIVE', amount: '10', type: 'percent', uses: 5, status: 'active' },
        { ID: 2, name: 'Expired', code: 'EXPIRED', amount: '20', type: 'percent', uses: 100, status: 'expired' },
        { ID: 3, name: 'Also Active', code: 'ACTIVE2', amount: '15', type: 'flat', uses: 2, status: 'active' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ discounts: mockDiscounts }),
      });

      const discounts = await client.listActiveDiscounts();

      expect(discounts).toHaveLength(2);
      expect(discounts.every((d) => d.status === 'active')).toBe(true);
    });
  });

  describe('getStatsByPreset', () => {
    it('should pass date preset to stats endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stats: {
            earnings: { current_month: 5000, totals: 100000 },
          },
        }),
      });

      const stats = await client.getStatsByPreset('earnings', 'this_month');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('date=this_month');
      expect(calledUrl).toContain('type=earnings');
      expect(stats.earnings?.current_month).toBe(5000);
    });
  });
});
