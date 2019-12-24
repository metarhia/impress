({
  // Cloud configuration
  cloud: 'PrivateCloud', // cloud name
  server: '10000000', // Server binary prefix Id
  instance: 'standalone', // cloud instance type: standalone, controller, server
  key: '19nm58993eJ747845fk78A2z7854W90D', // Cloud access key
  gc: 0, // garbage collector interval '1h' - 1 hour, '10m' - 10 minutes
  watch: Duration('2s'), // combine wached file system events if in interval
  shutdown: Duration('5s'),
});
