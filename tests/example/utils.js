'use strict'

const metatests = require('metatests');

const HOSTNAME = '127.0.0.1';
const PORT = 5000;

const connect = cb =>
  api.jstp.ws.connectAndInspect(
    'example', null, ['interfaceName'],
    {}, `ws://${HOSTNAME}:${PORT}`, cb);

module.exports = {
  connect,
}