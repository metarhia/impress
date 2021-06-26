'use strict';

const { metautil, metaschema } = require('./dependencies.js').metarhia;
const { Semaphore, createAbortController } = metautil;

const { Schema } = metaschema;

const EMPTY_CONTEXT = Object.freeze({});

class Procedure {
  constructor(script, application) {
    const exp = script(EMPTY_CONTEXT);
    this.exports = exp;
    this.script = script;
    this.application = application;
    this.method = null;
    if (typeof exp === 'object') this.method = exp.method;
    else if (typeof exp === 'function') this.method = exp;
    const namespaces = application.schemas ? [application.schemas.model] : [];
    const { parameters, returns } = exp;
    this.parameters = parameters ? Schema.from(parameters, namespaces) : null;
    this.returns = returns ? Schema.from(returns, namespaces) : null;
    this.semaphore = null;
    if (exp.queue) {
      const { concurrency, size, timeout } = exp.queue;
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
    await this.application.server.semaphore.enter();
    if (this.concurrency) {
      try {
        await this.semaphore.enter();
      } catch (err) {
        this.application.server.semaphore.leave();
        throw err;
      }
    }
  }

  leave() {
    this.application.server.semaphore.leave();
    if (this.concurrency) this.semaphore.leave();
  }

  async invoke(context, args = {}) {
    const { script, parameters, validate, returns, timeout } = this;
    const exp = script(context);
    const method = typeof exp === 'object' ? exp.method : exp;
    if (parameters) {
      const { valid, errors } = parameters.check(args);
      const problems = errors.join('; ');
      if (!valid) return new Error('Invalid parameters type: ' + problems);
    }
    if (validate) {
      validate(args);
    }
    let result;
    if (timeout) {
      const ac = createAbortController();
      result = await Promise.race([
        metautil.timeout(timeout, ac.signal),
        method(args),
      ]);
      ac.abort();
    } else {
      result = await method(args);
    }
    if (result instanceof this.application.Error) return result;
    if (returns) {
      const { valid, errors } = this.returns.check(result);
      const problems = errors.join('; ');
      if (!valid) return new Error('Invalid result type: ' + problems);
    }
    return result;
  }
}

module.exports = { Procedure };
