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

export class EDDHttpError extends Error {
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly contentType: string | null;
  readonly serverHeader: string | null;
  readonly bodySnippet: string;

  constructor(options: {
    url: string;
    status: number;
    statusText: string;
    contentType: string | null;
    serverHeader: string | null;
    bodySnippet: string;
    message: string;
  }) {
    super(options.message);
    this.name = 'EDDHttpError';
    this.url = options.url;
    this.status = options.status;
    this.statusText = options.statusText;
    this.contentType = options.contentType;
    this.serverHeader = options.serverHeader;
    this.bodySnippet = options.bodySnippet;
  }
}

function normalizeSnippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 700);
}

function buildHelpfulHttpError(options: {
  url: string;
  status: number;
  statusText: string;
  contentType: string | null;
  serverHeader: string | null;
  bodySnippet: string;
}): EDDHttpError {
  const hints: string[] = [];

  const isHtml =
    (options.contentType || '').includes('text/html') ||
    options.bodySnippet.startsWith('<!DOCTYPE') ||
    options.bodySnippet.startsWith('<html') ||
    options.bodySnippet.includes('<html');

  const looksLikeCloudflare =
    /cloudflare/i.test(options.serverHeader || '') || /cloudflare/i.test(options.bodySnippet);

  if (options.status === 404) {
    hints.push('404 usually means the Store API URL is wrong (it should end with `/edd-api/`).');
  }

  if (options.status === 401 || options.status === 403) {
    hints.push('Auth error: check the API Key / Token are correct and enabled in EDD settings.');
  }

  if (isHtml) {
    hints.push('Got HTML instead of JSON. This often indicates a WAF/proxy page or a wrong URL.');
  }

  if (looksLikeCloudflare) {
    hints.push(
      'Cloudflare detected. If you see a challenge/blocked page, allowlist the request or disable challenge for `/edd-api/*`.'
    );
  }

  const headerBits = [
    options.contentType ? `content-type=${options.contentType}` : null,
    options.serverHeader ? `server=${options.serverHeader}` : null,
  ].filter(Boolean);

  const parts = [
    `HTTP ${options.status}: ${options.statusText}`,
    `URL: ${options.url}`,
    headerBits.length ? `Headers: ${headerBits.join(', ')}` : null,
    options.bodySnippet ? `Body: ${options.bodySnippet}` : null,
    hints.length ? `Hints:\n- ${hints.join('\n- ')}` : null,
  ].filter(Boolean);

  return new EDDHttpError({
    ...options,
    message: parts.join('\n'),
  });
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
          const contentType = response.headers.get('content-type');
          const serverHeader = response.headers.get('server');
          let text = '';
          try {
            text = await response.text();
          } catch {
            // ignore
          }

          throw buildHelpfulHttpError({
            url,
            status: response.status,
            statusText: response.statusText,
            contentType,
            serverHeader,
            bodySnippet: normalizeSnippet(text),
          });
        }

        const data = (await response.json()) as T & { error?: string };

        // Check for API-level errors
        // "No X found!" messages are not real errors — just empty results
        // Use [\w\s]+ to match multi-word entities like "download logs"
        if (data.error && !/^No [\w\s]+ found!?$/i.test(data.error)) {
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

  /**
   * Build a V2 API URL. Inserts `v2/` before the endpoint in the API path.
   */
  private buildV2Url(endpoint: string, params: Record<string, string | number | undefined> = {}): string {
    // apiUrl is like https://example.com/edd-api/
    // We need https://example.com/edd-api/v2/{endpoint}/
    const base = this.apiUrl.replace(/\/$/, '');
    const v2Base = `${base}/v2/`;
    const url = new URL(endpoint, v2Base);

    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('token', this.apiToken);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  // ===========================================================================
  // Products Endpoints (V2 API)
  // ===========================================================================

  /**
   * List products. Always uses V2 API for richer response data (sku, category/tag
   * objects, file index/attachment_id). Supports search, category, and tag filtering.
   * Note: V2 products endpoint doesn't require auth for public products, but
   * including auth doesn't hurt and allows access to non-public products.
   */
  async listProducts(options: {
    number?: number;
    product?: number;
    search?: string;
    category?: string;
    tag?: string;
  } = {}): Promise<Product[]> {
    const params: Record<string, string | number | undefined> = {
      number: options.number,
      product: options.product,
    };
    if (options.search) params.s = options.search;
    if (options.category) params.category = options.category;
    if (options.tag) params.tag = options.tag;

    const url = this.buildV2Url('products/', params);
    const response = await this.request<ProductsResponse>(url);
    // V2 may return products as a numeric-keyed object instead of an array
    const raw = response.products;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
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
  // Customers Endpoints (V2 API)
  // ===========================================================================

  /**
   * List customers with pagination. Always uses V2 API for richer response data
   * (date_created, additional_emails). Optionally filter by date preset or date range.
   */
  async listCustomers(options: {
    number?: number;
    page?: number;
    date?: string;
    startdate?: string;
    enddate?: string;
  } = {}): Promise<Customer[]> {
    const params: Record<string, string | number | undefined> = {
      number: options.number,
      page: options.page,
    };

    if (options.startdate && options.enddate) {
      params.date = 'range';
      params.startdate = options.startdate;
      params.enddate = options.enddate;
    } else if (options.date) {
      params.date = options.date;
    }

    const url = this.buildV2Url('customers/', params);
    const response = await this.request<CustomersResponse>(url);
    return response.customers || [];
  }

  /**
   * Get a customer by ID or email (V2 API).
   * Uses the V2 `&customer={identifier}` param which accepts both IDs and emails.
   */
  async getCustomerById(customerId: number): Promise<Customer | null> {
    const url = this.buildV2Url('customers/', { customer: customerId });
    const response = await this.request<CustomersResponse>(url);
    return response.customers?.[0] || null;
  }

  /**
   * Get a customer by email (V2 API).
   */
  async getCustomerByEmail(email: string): Promise<Customer | null> {
    const url = this.buildV2Url('customers/', { customer: email });
    const response = await this.request<CustomersResponse>(url);
    return response.customers?.[0] || null;
  }

  // ===========================================================================
  // Stats Endpoints (Authenticated)
  // ===========================================================================

  /**
   * Get general stats (current month, last month, totals).
   * Optionally pass a date preset (today, yesterday, this_week, etc.) to filter.
   */
  async getStats(type: 'sales' | 'earnings', date?: string): Promise<StatsResponse['stats']> {
    const params: Record<string, string | number | undefined> = { type };
    if (date) params.date = date;
    const url = this.buildUrl('stats/', params);
    const response = await this.request<Record<string, unknown>>(url);

    return this.normalizeStatsResponse(response, type);
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
    const response = await this.request<Record<string, unknown>>(url);

    const withinRange = (key: string): boolean => {
      const normalized = key.includes('-') ? key.replace(/-/g, '') : key;
      if (!/^\d{8}$/.test(normalized)) return false;
      return normalized >= startDate && normalized <= endDate;
    };

    const extractValue = (value: unknown): number | null => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (value && typeof value === 'object') {
        const maybe = (value as Record<string, unknown>)[type];
        return extractValue(maybe);
      }
      return null;
    };

    const daily: Record<string, number> = {};
    for (const [key, value] of Object.entries(response)) {
      if (key === 'request_speed' || key === 'totals') continue;
      if (!withinRange(key)) continue;

      const parsed = extractValue(value);
      if (parsed !== null) daily[key] = parsed;
    }

    return daily;
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

    const extractNumber = (value: unknown): number | null => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (value && typeof value === 'object') {
        const maybe = (value as Record<string, unknown>)[type];
        return extractNumber(maybe);
      }
      return null;
    };

    const payload = (response.products as unknown) ?? response;
    const results: Array<{ name: string; value: number }> = [];

    if (Array.isArray(payload)) {
      for (const item of payload) {
        if (!item || typeof item !== 'object') continue;
        const name = (item as Record<string, unknown>).name;
        const value = (item as Record<string, unknown>).value;
        if (typeof name !== 'string') continue;
        const parsed = extractNumber(value);
        if (parsed !== null) results.push({ name, value: parsed });
      }
      return results;
    }

    if (!payload || typeof payload !== 'object') return results;

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (key === 'request_speed' || key === 'products') continue;
      const parsed = extractNumber(value);
      if (parsed !== null) results.push({ name: key, value: parsed });
    }

    return results;
  }

  /**
   * Normalize the varied stats response formats from the EDD API.
   */
  private normalizeStatsResponse(
    response: Record<string, unknown>,
    type: 'sales' | 'earnings'
  ): StatsResponse['stats'] {
    if ('stats' in response && response.stats) {
      return response.stats as StatsResponse['stats'];
    }
    // Direct response format: { earnings: {...}, request_speed: ... }
    return { [type]: response[type] } as StatsResponse['stats'];
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

  /**
   * Get a discount by its code (client-side filter).
   * Note: The EDD API does not support server-side filtering by code,
   * so this fetches all discounts and filters locally.
   */
  async getDiscountByCode(code: string): Promise<Discount | null> {
    const discounts = await this.listDiscounts({ number: -1 });
    const match = discounts.find(
      (d) => d.code.toLowerCase() === code.toLowerCase()
    );
    return match || null;
  }

  /**
   * List only active discounts (client-side filter).
   * Note: Fetches `number` discounts then filters to active ones, so the
   * returned count may be less than requested. Use `number: -1` to fetch
   * all discounts first if you need an exact count of active discounts.
   */
  async listActiveDiscounts(options: { number?: number } = {}): Promise<Discount[]> {
    const discounts = await this.listDiscounts(options);
    return discounts.filter((d) => d.status === 'active');
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
