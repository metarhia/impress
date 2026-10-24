'use strict';

const { metarhia } = require('./deps.js');
const { Error, DomainError, Semaphore } = metarhia.metautil;

const EMPTY_CONTEXT = Object.freeze({});

const createSchema = (definition, application) => {
  if (!definition) return null;
  const namespaces = application.schemas ? [application.schemas.model] : [];
  return metarhia.metaschema.Schema.from(definition, namespaces);
};

const checkSchema = (schema, value, kind) => {
  const { valid, errors } = schema.check(value);
  if (valid) return null;
  return new Error(`Invalid ${kind} type: ${errors.join('; ')}`);
};

class Procedure {
  constructor(script, methodName, application) {
    const exp = script(EMPTY_CONTEXT);
    this.exports = exp;
    this.script = script;
    this.methodName = methodName;
    this.application = application;
    this.method = null;
    if (typeof exp === 'object') this.method = exp[methodName];
    else if (typeof exp === 'function') this.method = exp;
    this.parameters = createSchema(exp.parameters, application);
    this.returns = createSchema(exp.returns, application);
    this.errors = exp.errors ?? null;
    this.semaphore = exp.queue ? new Semaphore(exp.queue) : null;
    this.caption = exp.caption ?? '';
    this.description = exp.description ?? '';
    this.access = exp.access ?? '';
    this.validate = exp.validate ?? null;
    const { timeouts } = application.config.server;
    this.timeout = (exp.timeout ?? timeouts.request) || 0;
    this.serializer = exp.serialize ?? null;
    this.protocols = exp.protocols ?? null;
    this.deprecated = exp.deprecated ?? false;
    this.assert = exp.assert ?? null;
    this.examples = exp.examples ?? null;
  }

  async enter() {
    await this.application.semaphore.enter();
    if (this.semaphore) {
      try {
        await this.semaphore.enter();
      } catch (error) {
        this.application.semaphore.leave();
        throw error;
      }
    }
  }

  leave() {
    this.application.semaphore.leave();
    if (this.semaphore) this.semaphore.leave();
  }

  async invoke(context, args = {}) {
    const { parameters, validate, returns, errors, timeout } = this;
    const exp = this.script(context);
    const method = typeof exp === 'object' ? exp[this.methodName] : exp;
    if (parameters) {
      const error = checkSchema(parameters, args, 'parameters');
      if (error) return error;
    }
    if (validate) await validate(args);
    let promise = method(args);
    if (timeout) promise = metarhia.metautil.timeoutify(promise, timeout);
    let result = await promise;
    if (metarhia.metautil.isError(result)) {
      if (result instanceof DomainError) result = result.toError(errors);
      return result;
    }
    if (returns) return checkSchema(returns, result, 'result') || result;
    return result;
  }
}

module.exports = { Procedure, createSchema, checkSchema };
