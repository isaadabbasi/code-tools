import { URL_ANALYTICS, APPLICATION } from '../core/envConstants';

class AnalyticsService {
  constructor() {
    this.initializeWorker();
    this.observeWindowUnload();
  }
  async initializeWorker() {
    this.analyticsWorker = new Worker('../scripts/analyticsWorker.js');
    const configuration = JSON.stringify({
      type: 'INIT_SERVICE',
      data: {
        preflightCriteria: 1,
        retryCount: 3,
        ttl: 5,
        url: URL_ANALYTICS
      }
    });
    this.analyticsWorker.postMessage(configuration);
  }
  sendAnalytics(payload) {
    const serializedPayload = JSON.stringify(payload);
    this.analyticsWorker.postMessage(serializedPayload);
  }
  observeWindowUnload() {
    const post = payload => this.analyticsWorker.postMessage(payload);
    window.onbeforeunload = function() {
      const payload = JSON.stringify({ type: 'ON_BEFORE_UNLOAD' });
      post(payload);
    };
  }
}
export const analyticsService = new AnalyticsService();

/**
 * @param {{
 *  actionName: string;
 *  actionCategory: string;
 *  startDateTime: Date
 * }} [analyticsPayload={}]
 */
export function sendAnalytics(analyticsPayload = {}) {
  // must bind to component
  const validFields = ['actionName', 'actionCategory', 'startDateTime'];
  const isValidPayload = validFields.every(key =>
    analyticsPayload.hasOwnProperty(key)
  );
  if (!isValidPayload) {
    console.error('Invalid analytics payload, required fields', validFields);
    return;
  }
  const analyticsProps = this.props.analytics;
  const analytics = {
    actionCategory: analyticsPayload.actionCategory,
    actionName: analyticsPayload.actionName,
    actionTab: analyticsProps.hash,
    application: APPLICATION,
    clinicId: analyticsProps.clinicId,
    startDateTime: analyticsPayload.startDateTime,
    userId: analyticsProps.userId,
    endDateTime: analyticsPayload.endDateTime
  };

  analyticsService.sendAnalytics(analytics);
}

/**
 * @export
 * @param {string} actionCategory
 * @param {string} actionName
 * @param {string} startDateTime
 * @param {string} [endDateTime]
 */
export function makeAnalyticsPayload(
  actionCategory,
  actionName,
  startDateTime,
  endDateTime
) {
  return {
    actionCategory,
    actionName,
    endDateTime,
    startDateTime
  };
}
