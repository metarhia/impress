{
  cloud: 'PrivateCloud',
  server: 'S1',
  controller: { // uplink to Impress Cloud Controller
    host: '127.0.0.1',
    port: 250
  },
  instance: 'standalone',

  key: '19nm58993eJ747845fk78A2z7854W90D', // Cloud access key
  cookie: 'node',

  firewall: {
    enabled: false
  },

  health: Duration('5s'),
  nagle: false,
  gc: 0,
  watch: Duration('2s')
}
