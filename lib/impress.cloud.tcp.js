'use strict';

console.log('transport: tcp');

impress.cloud.transport = {};

impress.cloud.transport.createServer = api.net.createServer;
impress.cloud.transport.connect = api.net.connect;
