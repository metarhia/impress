'use strict';

const { metarhia } = require('./deps.js');
const { Error, DomainError } = metarhia.metautil;

const EMPTY_CONTEXT = Object.freeze({});

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
    const namespaces = application.schemas ? [application.schemas.model] : [];
    const { parameters, returns, errors } = exp;
    const { Schema } = metarhia.metaschema;
    this.parameters = parameters ? Schema.from(parameters, namespaces) : null;
    this.returns = returns ? Schema.from(returns, namespaces) : null;
    this.errors = errors || null;
    this.semaphore = null;
    if (exp.queue) {
      const { concurrency, size, timeout } = exp.queue;
      const { Semaphore } = metarhia.metautil;
      this.semaphore = new Semaphore(concurrency, size, timeout);
    }
    this.caption = exp.caption || '';
    this.description = exp.description || '';
    this.access = exp.access || '';
    this.validate = exp.validate || null;
    this.timeout = exp.timeout || 0;
    this.serializer = exp.serialize || null;
    this.protocols = exp.protocols || null;
    this.deprecated = exp.deprecated || false;
    this.assert = exp.assert || null;
    this.examples = exp.examples || null;
  }

  async enter() {
    await this.application.semaphore.enter();
    if (this.concurrency) {
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
    if (this.concurrency) this.semaphore.leave();
  }

  async invoke(context, args = {}) {
    const { parameters, validate, returns, errors } = this;
    const exp = this.script(context);
    const method = typeof exp === 'object' ? exp[this.methodName] : exp;
    if (parameters) {
      const { valid, errors } = parameters.check(args);
      const problems = errors.join('; ');
      if (!valid) return new Error('Invalid parameters type: ' + problems);
    }
    if (validate) await validate(args);
    let result = await method(args);
    if (metarhia.metautil.isError(result)) {
      if (result instanceof DomainError) result = result.toError(errors);
      return result;
    }
    if (returns) {
      const { valid, errors } = this.returns.check(result);
      const problems = errors.join('; ');
      if (!valid) return new Error('Invalid result type: ' + problems);
    }
    return result;
  }
}

module.exports = { Procedure };
