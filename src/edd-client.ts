import type {
  Product,
  ProductsResponse,
  Customer,
  CustomersResponse,
  Sale,
  SalesResponse,
  StatsResponse,
  Discount,
  DiscountsResponse,
  DownloadLog,
  DownloadLogsResponse,
} from './types.js';

export interface EDDClientConfig {
  apiUrl: string;
  apiKey: string;
  apiToken: string;
}

/**
 * Client for the Easy Digital Downloads REST API.
 * Handles authentication and provides typed methods for all endpoints.
 */
export class EDDClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly apiToken: string;

  constructor(config: EDDClientConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.apiToken = config.apiToken;
  }

  /**
   * Build URL with authentication and query parameters.
   */
  private buildUrl(endpoint: string, params: Record<string, string | number | undefined> = {}): string {
    const url = new URL(endpoint, this.apiUrl);

    // Add authentication
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('token', this.apiToken);

    // Add additional parameters
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * Build public URL (no auth required, e.g., products endpoint).
   */
  private buildPublicUrl(endpoint: string, params: Record<string, string | number | undefined> = {}): string {
    const url = new URL(endpoint, this.apiUrl);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * Make HTTP request with retry logic.
   */
  private async request<T>(url: string, retries = 3): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as T & { error?: string };

        // Check for API-level errors
        if (data.error) {
          throw new Error(`EDD API Error: ${data.error}`);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  // ===========================================================================
  // Products Endpoints (Public - no auth required)
  // ===========================================================================

  /**
   * List all products.
   */
  async listProducts(options: { number?: number; product?: number } = {}): Promise<Product[]> {
    const url = this.buildPublicUrl('products/', options);
    const response = await this.request<ProductsResponse>(url);
    return response.products;
  }

  /**
   * Get a single product by ID.
   */
  async getProduct(productId: number): Promise<Product | null> {
    const products = await this.listProducts({ product: productId });
    return products[0] || null;
  }

  // ===========================================================================
  // Sales Endpoints (Authenticated)
  // ===========================================================================

  /**
   * List recent sales with optional filtering.
   */
  async listSales(options: {
    number?: number;
    page?: number;
    email?: string;
    startdate?: string;
    enddate?: string;
  } = {}): Promise<Sale[]> {
    const url = this.buildUrl('sales/', options);
    const response = await this.request<SalesResponse>(url);
    return response.sales || [];
  }

  /**
   * Get a sale by ID.
   */
  async getSaleById(saleId: number): Promise<Sale | null> {
    const url = this.buildUrl('sales/', { id: saleId });
    const response = await this.request<SalesResponse>(url);
    return response.sales?.[0] || null;
  }

  /**
   * Get a sale by purchase key.
   */
  async getSaleByKey(purchaseKey: string): Promise<Sale | null> {
    const url = this.buildUrl('sales/', { key: purchaseKey });
    const response = await this.request<SalesResponse>(url);
    return response.sales?.[0] || null;
  }

  /**
   * Search sales by customer email.
   */
  async searchSalesByEmail(email: string, options: { number?: number; page?: number } = {}): Promise<Sale[]> {
    return this.listSales({ ...options, email });
  }

  // ===========================================================================
  // Customers Endpoints (Authenticated)
  // ===========================================================================

  /**
   * List customers with pagination.
   */
  async listCustomers(options: { number?: number; page?: number } = {}): Promise<Customer[]> {
    const url = this.buildUrl('customers/', options);
    const response = await this.request<CustomersResponse>(url);
    return response.customers || [];
  }

  /**
   * Get a customer by ID.
   */
  async getCustomerById(customerId: number): Promise<Customer | null> {
    const url = this.buildUrl('customers/', { customer: customerId });
    const response = await this.request<CustomersResponse>(url);
    return response.customers?.[0] || null;
  }

  /**
   * Get a customer by email.
   */
  async getCustomerByEmail(email: string): Promise<Customer | null> {
    const url = this.buildUrl('customers/', { email });
    const response = await this.request<CustomersResponse>(url);
    return response.customers?.[0] || null;
  }

  // ===========================================================================
  // Stats Endpoints (Authenticated)
  // ===========================================================================

  /**
   * Get general stats (current month, last month, totals).
   */
  async getStats(type: 'sales' | 'earnings'): Promise<StatsResponse['stats']> {
    const url = this.buildUrl('stats/', { type });
    // API returns stats directly without wrapper
    const response = await this.request<Record<string, unknown>>(url);

    // Handle both response formats
    if ('stats' in response && response.stats) {
      return response.stats as StatsResponse['stats'];
    }

    // Direct response format: { earnings: {...}, request_speed: ... }
    // or { sales: {...}, request_speed: ... }
    return {
      [type]: response[type],
    } as StatsResponse['stats'];
  }

  /**
   * Get stats for a date range.
   */
  async getStatsByDateRange(
    type: 'sales' | 'earnings',
    startDate: string,
    endDate: string
  ): Promise<Record<string, number>> {
    const url = this.buildUrl('stats/', {
      type,
      date: 'range',
      startdate: startDate,
      enddate: endDate,
    });
    const response = await this.request<{ [key: string]: number }>(url);

    // Remove non-date keys
    const { request_speed: _speed, totals: _totals, ...dateData } = response as Record<string, number>;
    return dateData;
  }

  /**
   * Get stats for a specific product or all products.
   */
  async getStatsByProduct(
    type: 'sales' | 'earnings',
    productId?: number
  ): Promise<Array<{ name: string; value: number }>> {
    const url = this.buildUrl('stats/', {
      type,
      product: productId ?? 'all',
    });
    const response = await this.request<Record<string, unknown>>(url);

    // Parse the product stats response
    const results: Array<{ name: string; value: number }> = [];
    for (const [key, value] of Object.entries(response)) {
      if (key !== 'request_speed' && typeof value === 'number') {
        results.push({ name: key, value });
      }
    }
    return results;
  }

  // ===========================================================================
  // Discounts Endpoints (Authenticated)
  // ===========================================================================

  /**
   * List all discount codes.
   */
  async listDiscounts(options: { number?: number } = {}): Promise<Discount[]> {
    const url = this.buildUrl('discounts/', options);
    const response = await this.request<DiscountsResponse>(url);
    return response.discounts || [];
  }

  /**
   * Get a discount by ID.
   */
  async getDiscount(discountId: number): Promise<Discount | null> {
    const url = this.buildUrl('discounts/', { discount: discountId });
    const response = await this.request<DiscountsResponse>(url);
    return response.discounts?.[0] || null;
  }

  // ===========================================================================
  // Download Logs Endpoints (Authenticated)
  // ===========================================================================

  /**
   * Get file download logs.
   */
  async getDownloadLogs(options: {
    number?: number;
    product?: number;
    customer?: number;
  } = {}): Promise<DownloadLog[]> {
    const url = this.buildUrl('file-download-logs/', options);
    const response = await this.request<DownloadLogsResponse>(url);
    return response.download_logs || [];
  }
}
