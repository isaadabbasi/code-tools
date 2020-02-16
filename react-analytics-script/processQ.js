const APIService = {
  url: '',
  post: function(data) {
    const url = APIService.url;
    return fetch('http://localhost:4000', {
      body: JSON.stringify(data),
      method: 'POST'
    }).then(res => res && res.json());
  }
};

class ProcessQ {
  errorQueue = [];
  eventsBuffer; // queue must have this length before sending to server
  interval; // setTimeout seconds
  queue = [];
  retryCount;
  WorkerScope;
  constructor(
    WorkerScope,
    { interval = 0, eventsBuffer = 15, retryCount = 1, url = '' }
  ) {
    APIService.url = url;
    this.eventsBuffer = eventsBuffer;
    this.retryCount = retryCount;
    this.interval = interval * 1000;
    this.WorkerScope = WorkerScope;
  }

  resetAnalyticaQueue() {
    this.queue = [];
  }

  pushToQueue(payload) {
    this.queue.push(payload);
    this.postPushToQueue(payload);
  }
  postPushToQueue() {
    // * processCriteria could be one, thats why we need to check it right away.
    const isBufferFull = this.eventsBuffer <= this.queue.length;
    const intervalNotSet = this.interval === 0;
    if (isBufferFull && intervalNotSet) {
      this.sendBeats();
      return;
    }
    // TODO - forced events
  }

  deepClone(payload) {
    return JSON.parse(JSON.stringify(payload));
  }
  sendBeats(forcePush = false) {
    const isBufferFull = this.eventsBuffer <= this.queue.length;

    if (!forcePush && !isBufferFull) {
      if (this.interval > 0) this.initializeTimer();
      return;
    }
    const events = this.deepClone(this.queue);
    this.queue = [];
    clearTimeout(this.timeout);
    this.timeout = undefined;
    if (APIService.url) this.flight(events);
    else this.WorkerScope.postMessage(events);
  }
  flight(events) {
    let triedTimes = 1,
      success = false,
      retryCount = this.retryCount;
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
    const timeout = fn => setTimeout(fn.bind(this), this.interval);
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
    const intervalNotSet = this.interval > 0;
    if (isFirstPush && intervalNotSet) this.initializeTimer();
    this.pushToQueue(payload);
  }
}
