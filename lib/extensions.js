'use strict';

impress.extensions = {

  html: client => {
    if (typeof client.context.data === 'string') {
      client.end(client.context.data);
    } else {
      client.processingPage();
    }
  },

  sse: client => {
    if (!client.application.sse) {
      client.error(510);
      return;
    }
    client.sseConnect();
  },

  ws: client => {
    if (!client.application.websocket) {
      client.error(510);
      return;
    }
    client.application.websocket.finalize(client);
  },

  json: client => {
    if (!client.context.data) {
      client.error(400);
      return;
    }
    client.end(api.json.stringify(client.context.data));
  },

  jsonp: client => {
    if (!client.context.data) {
      client.error(400);
      return;
    }
    const jsonpCallbackName = client.query.callback ||
      client.query.jsonp || 'callback';
    const data = api.json.stringify(client.context.data);
    client.end(jsonpCallbackName + '(' + data + ');');
  },

  csv: client => {
    if (!client.context.data) {
      client.error(400);
      return;
    }
    api.csv.stringify(client.context.data, (err, data) => {
      if (err) {
        client.error(500, err);
        return;
      }
      client.end(data);
    });
  }

};
