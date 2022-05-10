'use strict';

const http = require('http');
const metautil = require('metautil');
const { Schema } = require('metaschema');
const { Modules } = require('./modules.js');

const request = (url, { method, data }) =>
  new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      const code = res.statusCode;
      if (code !== 200) {
        const dest = `for ${method} ${url}`;
        return reject(new Error(`HTTP status code ${code} ${dest}`));
      }
      metautil.receiveBody(res).then((data) => {
        const json = data.toString();
        try {
          const object = JSON.parse(json);
          resolve(object);
        } catch (error) {
          return reject(error);
        }
      }, reject);
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });

class Services extends Modules {
  preprocess(iface) {
    const { application } = this;
    const namespaces = application.schemas ? [application.schemas.model] : [];
    const { parameters, returns } = iface;
    const validation = {
      parameters: parameters ? Schema.from(parameters, namespaces) : null,
      returns: returns ? Schema.from(returns, namespaces) : null,
    };
    const method = async (args) => {
      const { parameters, returns } = validation;
      if (parameters) {
        const { valid, errors } = parameters.check(args);
        const problems = errors.join('; ');
        if (!valid) return new Error('Invalid parameters type: ' + problems);
      }
      const service = method.parent['.service'];
      const verb = iface.method.get ? 'get' : 'post';
      const target = [service.url, iface.method[verb]];
      if (iface.method.path) {
        target.push(...iface.method.path.map((arg) => args[arg]));
      }
      const url = target.join('/');
      const result = await request(url, { method: verb.toUpperCase() });
      if (returns) {
        const { valid, errors } = returns.check(result);
        const problems = errors.join('; ');
        if (!valid) return new Error('Invalid result type: ' + problems);
      }
      return result;
    };
    return Object.assign(method, iface);
  }
}

module.exports = { Services };
