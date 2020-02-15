const APIService = {
  url: '',
  sendAnalyticsBeats: function(data) {
    const url = APIService.url;
    return fetch(url, {
      body: JSON.stringify(data),
      method: 'POST'
    }).then(res => res && res.json());
  }
};

// enabling multi instanciations
class AnalyticsService {
  analyticsQueue = [];
  errorQueue = [];
  preflightCriteria; // queue must have this length before sending to server
  timeout; // setTimeout instance
  ttl; // setTimeout seconds
  constructor({ ttl = 20, preflightCriteria = 15, retryCount = 1, url = '' }) {
    this.preflightCriteria = preflightCriteria;
    this.ttl = ttl;
    this.retryCount = retryCount;
    APIService.url = url;
  }

  resetAnalyticaQueue() {
    this.analyticsQueue = [];
  }
  beforeWidowUnload() {
    if (this.analyticsQueue.length > 0) {
      this.sendBeats(undefined, true);
    }
  }
  verifyPayload(payload = {}) {
    const hasValidProp = key =>
      payload.hasOwnProperty(key) && typeof payload[key] === 'string';
    const expectedPayloadKeys = [
      'actionCategory',
      'actionName',
      'startDateTime'
    ];
    const isOk = expectedPayloadKeys.every(hasValidProp);

    return isOk;
  }
  pushToQueue(payload) {
    this.analyticsQueue.push(payload);
    let forceSendRequested = ['logout'].includes(
      payload.actionName.toLowerCase()
    );
    if (forceSendRequested) this.sendBeats(undefined, true);
  }

  deepClone(payload) {
    return JSON.parse(JSON.stringify(payload));
  }
  sendBeats(retryCount = this.retryCount, forcePush = false, callbacks = {}) {
    let fulfilsPreflightCriteria =
        (this.analyticsQueue || []).length >= this.preflightCriteria,
      triedTimes = 1,
      success = false;
    if (!forcePush && !fulfilsPreflightCriteria) {
      this.initializeTimer();
      return;
    }
    const analytics = this.deepClone(this.analyticsQueue);
    this.analyticsQueue = [];
    clearTimeout(this.timeout);
    this.timeout = undefined;
    const upstream = async () => {
      triedTimes = triedTimes + 1;
      try {
        await APIService.sendAnalyticsBeats(analytics);
        success = true;
      } catch (e) {
        // this does not make much sense as now we dont have error queue API. 😐
        this.pushSanitizedErr(e, 'PREFLIGHT_BEAT_ERROR');
      }
      if (!success && triedTimes <= retryCount) upstream();
    };
    if (triedTimes === 1) upstream();
  }

  initializeTimer() {
    if (this.timeout !== undefined) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    const inSeconds = this.ttl * 1000;
    const timeout = fn => setTimeout(fn.bind(this), inSeconds);
    this.timeout = timeout(this.sendBeats);
  }
  pushSanitizedErr(error, name = `UNIDENTIFIED_ERROR`) {
    const payload = { error, name };
    this.errorQueue.push(payload);
  }
  addToQueue(payload) {
    const valid = this.verifyPayload(payload),
      isFirstPush = (this.analyticsQueue || []).length === 0,
      isPreflightCriteriaMeet = () =>
        this.preflightCriteria <= this.analyticsQueue.length; //lazy evalution

    if (!valid) {
      this.pushSanitizedErr(payload, 'PAYLOAD_VALIDATION_ERROR');
      return;
    }
    if (isFirstPush) this.initializeTimer();
    this.pushToQueue(payload);
    if (isPreflightCriteriaMeet()) this.sendBeats();
  }
}
