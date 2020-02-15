importScripts('./processQ.js');
let processQueue;

function inject(lxVar, injectables) {
	for(const [key, value] of Object.entries(injectables)) {
    eval(`${lxVar}.${key} = ${value}`);
	}
}
function filterInjectables(payload) {
  const injectables = {};
	for(const [key, value] of Object.entries(payload)) {
    if(typeof value === 'string' && value.substring(0, 8) === 'function') 
      injectables[key] = value;
	}
	return injectables;
}
self.onmessage = function(e) {
  const action = JSON.parse(e.data);
  console.log('payload: [worker]:', action);
  switch (action.type) {
    case 'INIT_SERVICE': {
      if (action.data) self.close(); //useless;
      const config = action.payload;
      processQueue = new ProcessQ(self, config);      
      inject('processQueue', filterInjectables(config));
      
      console.log('analytics ispayloadvalid: ', processQueue.isPayloadValid);

      return;
    }
    case 'ON_BEFORE_UNLOAD': {
      processQueue.beforeWidowUnload();
      return;
    }
    default: {
      processQueue.processEvent(action.payload);
      return;
    }
  }
};

self.onerror = function(e) {
  console.error('Error in analyticsService: ', e);
};
