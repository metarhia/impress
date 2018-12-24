const runExamples = () => {

  // Resolve twice
  new Promise(resolve => {
    resolve('Resolve first');
    resolve('Resolve second');
  });

  // Reject twice
  new Promise((resolve, reject) => {
    reject(new Error('Reject first'));
    reject(new Error('Reject second'));
  });

  // Resolve after reject
  new Promise(resolve => {
    reject(new Error('Reject before resolve'));
    resolve('Resolve after reject');
  });

  // Reject after resolve
  new Promise((resolve, reject) => {
    resolve('Resolve before reject');
    reject(new Error('Reject after resolve'));
  });

  // unhandledRejection
  const ap = new Promise((resolve, reject) => {
    reject(new Error('Reject to generate unhandledRejection'));
  });

  // rejectionHandled
  setTimeout(() => {
    setTimeout(() => {
      ap.catch(() => {});
    }, 0);
  }, 0);

  // !
  const ee = new api.events.EventEmitter();
  for (let i = 0; i < 100; i++) {
    ee.on('eventName', () => {});
  }

};

if (application.nodeId === 'S1N1') {
  runExamples();
}
