// Server scale configuration

module.exports = {
  cloud:      'PrivateCloud',
  instance:   'standalone',

  controller: 'tcp://127.0.0.1',
  subPort:    3000,
  reqPort:    3001,

  cluster:    'C1',
  cookie:     'node',
  strategy:   'single',
  workers:    api.os.cpus().length,

  health:     '5s',
  nagle:      false,
  gcInterval: 0,
  watchInterval: 2000,
}
