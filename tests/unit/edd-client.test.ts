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
    mockFetch.mockClear();
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

    it('should build public URLs without auth for products', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await client.listProducts({ number: 3 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('products/');
      expect(calledUrl).not.toContain('key=');
      expect(calledUrl).not.toContain('token=');
    });
  });

  describe('listProducts', () => {
    it('should return products array', async () => {
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
    it('should return customers with pagination', async () => {
      const mockCustomers = [
        {
          info: { id: '1', email: 'customer@test.com' },
          stats: { total_purchases: 3, total_spent: 500, total_downloads: 10 },
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: mockCustomers }),
      });

      const customers = await client.listCustomers({ number: 10, page: 1 });

      expect(customers).toHaveLength(1);
      expect(customers[0].stats.total_spent).toBe(500);
    });
  });

  describe('getCustomerByEmail', () => {
    it('should find customer by email', async () => {
      const mockCustomer = {
        info: { id: '42', email: 'found@example.com', display_name: 'Found User' },
        stats: { total_purchases: 5, total_spent: 1000 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ customers: [mockCustomer] }),
      });

      const customer = await client.getCustomerByEmail('found@example.com');

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

  describe('error handling', () => {
    it('should throw on HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({}),
      }).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({}),
      }).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({}),
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
});
