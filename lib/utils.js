'use strict';

const makePrivate = instance => {
  const iface = {};
  const methods = Object.keys(instance);
  for (const methodName of methods) {
    const method = instance[methodName];
    if (typeof method === 'function') {
      const bindedMethod = method.bind(instance);
      iface[methodName] = bindedMethod;
      instance[methodName] = bindedMethod;
    }
  }
  return iface;
};

module.exports = { makePrivate };
