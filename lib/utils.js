'use strict';

const isConstant = s => s === s.toUpperCase();

const makePrivate = instance => {
  const iface = {};
  const fields = Object.keys(instance);
  for (const fieldName of fields) {
    const field = instance[fieldName];
    if (isConstant(fieldName)) {
      iface[fieldName] = field;
    } else if (typeof field === 'function') {
      const bindedMethod = field.bind(instance);
      iface[fieldName] = bindedMethod;
      instance[fieldName] = bindedMethod;
    }
  }
  return iface;
};

module.exports = { makePrivate };
