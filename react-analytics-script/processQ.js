const APIService = {
  url: '',
  post: function(data) {
    const url = APIService.url;
    return fetch(url, {
      body: JSON.stringify(data),
      method: 'POST'
    }).then(res => res && res.json());
  }
};

class ProcessQ {
  WorkerScope;
  errorQueue = [];
  eventsBuffer; // queue must have this length before sending to server
  queue = [];
  timeout; // setTimeout instance
  ttl; // setTimeout seconds
  constructor(WorkerScope, { ttl = 20, eventsBuffer = 15, retryCount = 1, url = '' }) {
    APIService.url = url;
    this.eventsBuffer = eventsBuffer;
    this.retryCount = retryCount;
    this.ttl = ttl;
    this.WorkerScope = WorkerScope; 
  }

  resetAnalyticaQueue() {
    this.queue = [];
  }

  pushToQueue(payload) {
    this.queue.push(payload);
    // * if timer is enabled, fixedSize push shouldn't be enabled.
    this.postPushToQueue(payload);

  }
  postPushToQueue(payload) {
    // * processCriteria could be one, thats why we need to check it right away.
    const isBufferFull = this.eventsBuffer <= this.queue.length;
    if (isBufferFull) {
      this.sendBeats();
      return;
    }    
    // TODO - ['logout'] should be be prop of forced events
    let forceSendRequested = ['logout'].filter(fEvent => Boolean(payload[fEvent])).length;
    if (forceSendRequested) this.sendBeats(undefined, true);
  }

  deepClone(payload) {
    return JSON.parse(JSON.stringify(payload));
  }
  sendBeats(retryCount = this.retryCount, forcePush = false) {
    const isBufferFull = this.eventsBuffer <= this.queue.length;

    if (!forcePush && !isBufferFull) {
      this.initializeTimer();
      return;
    }
    const events = this.deepClone(this.queue);
    this.queue = [];
    clearTimeout(this.timeout);
    this.timeout = undefined;

    let triedTimes = 1, success = false;
    const upstream = async () => {
      triedTimes = triedTimes + 1;
      try {
        await APIService.post(events);
        success = true;
      } catch (e) {
        // ? this does not make much sense as now we dont have error queue API. 😐
        this.pushSanitizedErr('POSTFLIGHT_PAYLOAD_ERROR', events);
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
  pushSanitizedErr(name = `UNIDENTIFIED_ERROR`, error) {
    const payload = { error, name };
    this.errorQueue.push(payload);
  }
  processEvent(payload) {
    let valid = true;
    if (this.isPayloadValid) valid = this.isPayloadValid(payload);
    if (!valid) {
      this.pushSanitizedErr('PAYLOAD_VALIDATION_ERROR', payload);
      return;
    }

    const isFirstPush = this.queue.length === 0;

    if (isFirstPush) this.initializeTimer();
    this.pushToQueue(payload);
  }
}
