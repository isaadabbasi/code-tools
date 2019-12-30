import { ANALYTICS_URL } from '../core/envConstants';

class AnalyticsWorkerService {
  constructor() {
    this.initializeWorker();
  }
  async initializeWorker() {
    this.analyticsWorker = new Worker('../scripts/analyticsWorker.js');
    const configuration = JSON.stringify({
      type: 'INIT_SERVICE',
      data: {
        preflightCriteria: 15,
        retryCount: 3,
        ttl: 20,
        url: ANALYTICS_URL
      }
    });
    this.analyticsWorker.postMessage(configuration);
  }
  sendAnalytics(payload) {
    const serializedPayload = JSON.stringify(payload);
    this.analyticsWorker.postMessage(serializedPayload);
  }
}
export const analyticsService = new AnalyticsWorkerService();
