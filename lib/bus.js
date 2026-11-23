'use strict';

const { metarhia } = require('./deps.js');
const { createSchema, checkSchema } = require('./procedure.js');

const prepare = (unit, application) => {
  const { query = {} } = unit;
  const parameters = createSchema(unit.parameters, application);
  const queryParams = createSchema(query.params, application);
  const returns = createSchema(unit.returns, application);
  const method = async (args = {}) => {
    if (parameters) {
      const error = checkSchema(parameters, args, 'parameters');
      if (error) return error;
    }
    if (queryParams) {
      const error = checkSchema(queryParams, args, 'query');
      if (error) return error;
    }
    const service = method.parent['.service'];
    const verb = unit.method.get ? 'get' : 'post';
    const target = [service.url, unit.method[verb]];
    const pathNames = unit.method.path ?? null;
    if (pathNames) {
      for (let i = 0; i < pathNames.length; i++) {
        target.push(args[pathNames[i]]);
      }
    }
    let url = target.join('/');
    if (unit.query) {
      const params = [];
      const prefix = unit.query.prefix ?? '';
      const suffix = unit.query.suffix ?? '';
      const names = Object.keys(unit.query.params);
      for (let i = 0; i < names.length; i++) {
        const param = names[i];
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
    if (returns) return checkSchema(returns, result, 'result') || result;
    return result;
  };
  const names = Object.keys(unit);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    method[name] = unit[name];
  }
  return method;
};

module.exports = { prepare };
