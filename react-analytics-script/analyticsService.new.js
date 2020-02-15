import { URL_ANALYTICS } from '../core/envConstants';
class WorkerService {
  constructor() {
    this.registry = new Map();
    this.onBeforeWindowUnload();
  }

  register(pathToScript, config) {
    const worker = new Worker(pathToScript);
    const token = Symbol(pathToScript);
    config.isPayloadValid = config.isPayloadValid
      ? config.isPayloadValid.toString()
      : undefined;
    worker.postMessage(this.serialize('INIT_SERVICE', config));
    this.registry.set(token, worker);
    return token;
  }
  onBeforeWindowUnload() {
    window.onbeforeunload = function() {
      const registry = this.registry;
      for (const worker of registry.values()) {
        worker.postMessage(this.serialize('ON_BEFORE_UNLOAD'));
      }
    };
  }
  serialize(type, payload) {
    return JSON.stringify({
      ...(type && { type }),
      ...(payload && { payload })
    });
  }
  sendMessage(token, type, payload) {
    const message = this.serialize(type, payload);
    this.getWorkerByToken(token).postMessage(message);
  }
  getWorkerByToken(token) {
    return this.registry.get(token);
  }
}
class Service {
  constructor(workerService, pathToScript, config) {
    this.workerService = workerService;
    this.token = workerService.register(pathToScript, config);
  }
  send(type, payload) {
    this.workerService.sendMessage(this.token, type, payload);
  }
}

const MakeService = (function() {
  const workerService = new WorkerService();
  return function(pathToScript, config) {
    return new Service(workerService, pathToScript, config);
  };
})();

export const analyticsService = MakeService('../scripts/analyticsWorker.js', {
  eventsBuffer: 3,
  ttl: 20,
  retryCount: 1,
  url: URL_ANALYTICS,
  isPayloadValid: function(payload = {}) {
    const required = ['actionName', 'actionCategory', 'startDateTime'];
    const isValidPayload = required.every(key => payload.hasOwnProperty(key));
    return isValidPayload;
  }
});

setInterval(function() {
  analyticsService.send('', {
    'actionName':  Date.now().toString(),
    'startDateTime':  Date.now().toString(),
    'actionCategory': Date.now().toString(),
  });
}, 5000)