/**
 * @signal-network/sdk
 * 
 * The official TypeScript SDK for the Signal DePIN Protocol.
 * Enables AI Agents and Smart Contracts to query verified real-world physical data.
 */

export interface SignalConfig {
  apiUrl?: string;
  apiKey?: string;
}

export interface OracleQuery {
  category: 'FUEL' | 'GROCERY' | 'RENT' | 'ELECTRICITY';
  minConfidence?: number;
}

export interface OracleData {
  price: number;
  category: string;
  timestamp: number;
  rewardPaid: number;
  reporterWallet: string;
}

export class SignalClient {
  private apiUrl: string;
  private apiKey: string | undefined;
  private pollingIntervals: Map<number, NodeJS.Timeout>;
  private nextSubId: number;

  constructor(config: SignalConfig = {}) {
    this.apiUrl = config.apiUrl || 'http://localhost:3001';
    this.apiKey = config.apiKey;
    this.pollingIntervals = new Map();
    this.nextSubId = 1;
  }

  /**
   * Fetches the latest verified price from the Signal Oracle Network.
   * 
   * @param query - Categorical constraints for the data request.
   * @returns The most recent verified physical data point matching the query.
   */
  async getLatestPrice(query: OracleQuery): Promise<OracleData> {
    try {
      // Execute real HTTP request to the Signal Aggregation Layer
      const response = await fetch(`${this.apiUrl}/api/reports`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}
      });

      if (!response.ok) {
        throw new Error(`Signal API Error: HTTP ${response.status}`);
      }

      const allReports = await response.json();
      
      // Filter the live DB results by the requested category
      const requiredCategory = query.category.toUpperCase();
      const filtered = allReports.filter((r: any) => r.category.toUpperCase() === requiredCategory);

      if (filtered.length === 0) {
        throw new Error(`No recent verified data found for category: ${query.category}`);
      }

      // The API returns them ordered by created_at DESC, so the 0-index is the absolute latest
      const latest = filtered[0];

      return {
        price: parseFloat(latest.price),
        category: latest.category,
        timestamp: latest.ts,
        rewardPaid: latest.reward,
        reporterWallet: latest.wallet
      };

    } catch (err: any) {
      throw new Error(`Failed to fetch from Signal Network: ${err.message}`);
    }
  }

  /**
   * Subscribes to the network feed via HTTP polling.
   * Triggers the callback ONLY when a new, unrecorded report is verified on-chain.
   * 
   * @param query - Category to subscribe to
   * @param callback - Function invoked with new oracle data
   * @returns Subscription ID (used for unsubscribing)
   */
  subscribeToNetwork(query: OracleQuery, callback: (data: OracleData) => void, pollIntervalMs = 5000): number {
    let lastKnownTimestamp = 0;
    const subId = this.nextSubId++;

    const interval = setInterval(async () => {
      try {
        const latest = await this.getLatestPrice(query);
        // Only trigger callback if the data is strictly newer than what we've seen
        if (latest.timestamp > lastKnownTimestamp) {
          lastKnownTimestamp = latest.timestamp;
          callback(latest);
        }
      } catch (e) {
        // Silent catch for network jitter or missing data in local env
      }
    }, pollIntervalMs);

    this.pollingIntervals.set(subId, interval);
    return subId;
  }

  /**
   * Terminate a specific network subscription.
   */
  unsubscribe(subscriptionId: number): void {
    const interval = this.pollingIntervals.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(subscriptionId);
    }
  }
}

export default SignalClient;
