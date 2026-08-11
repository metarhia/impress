'use strict';

const { metarhia } = require('./deps.js');

const prepare = (unit, application) => {
  const namespaces = application.schemas ? [application.schemas.model] : [];
  const { parameters, query = {}, returns } = unit;
  const { Schema } = metarhia.metaschema;
  const validation = {
    parameters: parameters ? Schema.from(parameters, namespaces) : null,
    query: query.params ? Schema.from(query.params, namespaces) : null,
    returns: returns ? Schema.from(returns, namespaces) : null,
  };
  const method = async (args = {}) => {
    const { parameters, query, returns } = validation;
    if (parameters) {
      const { valid, errors } = parameters.check(args);
      if (!valid) {
        return new Error(`Invalid parameters type: ${errors.join('; ')}`);
      }
    }
    if (unit.query.params) {
      const { valid, errors } = query.check(args);
      if (!valid) {
        return new Error(`Invalid query type: ${errors.join('; ')}`);
      }
    }
    const service = method.parent['.service'];
    const verb = unit.method.get ? 'get' : 'post';
    const target = [service.url, unit.method[verb]];
    if (unit.method.path) {
      const pathParts = unit.method.path.map((arg) => args[arg]);
      target.push(...pathParts);
    }
    let url = target.join('/');
    if (unit.query) {
      const params = [];
      const { prefix = '', suffix = '' } = unit.query;
      for (const param of Object.keys(unit.query.params)) {
        if (!args[param]) continue;
        const key = `${prefix}${param}${suffix}`;
        params.push([key, args[param]]);
      }
      const parsedParams = Object.fromEntries(params);
      const stringParams = new URLSearchParams(parsedParams).toString();
      url = params.length ? `${url}?${stringParams}` : url;
    }
    const body = metarhia.metautil.serializeArguments(unit.method.body, args);
    const options = { method: verb.toUpperCase(), headers: unit.headers, body };
    const result = await metarhia.metautil.httpApiCall(url, options);
    if (returns) {
      const { valid, errors } = returns.check(result);
      if (!valid) {
        return new Error(`Invalid result type: ${errors.join('; ')}`);
      }
    }
    return result;
  };
  return Object.assign(method, unit);
};

module.exports = { prepare };
