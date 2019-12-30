importScripts('./analyticsService.js');
let analyticsService;

self.onmessage = function(e) {
  const payload = JSON.parse(e.data);
  switch (payload.type) {
    case 'INIT_SERVICE': {
      analyticsService = new AnalyticsService(payload.data);
      return;
    }
    default: {
      analyticsService.addToQueue(payload);
      return;
    }
  }
};

self.onerror = function(e) {
  console.error('Error in analyticsService: ', e);
};
