'use strict';

const { metarhia } = require('./dependencies.js');
const { metautil } = metarhia;

const DIR_SCOPE = ['global', 'system', 'local', 'memory'];

const DIR_TABLE = ['dictionary', 'registry', 'entity', 'details', 'relation'];
const DIR_DATA = ['form', 'view', 'projection'];
const DIR_SYSTEM = [...DIR_TABLE, ...DIR_DATA];
const DIR_AUX = ['log', 'struct', 'scalar'];
const DIR_KIND = [...DIR_SYSTEM, ...DIR_AUX];

const parseDirective = (value) => {
  const short = typeof value === 'string';
  if (short) {
    const [kind, scope] = value.split(' ').reverse();
    value = { scope, kind };
  }
  if (!DIR_KIND.includes(value.kind)) {
    throw new Error(`Unknown kind directive: ${value.kind}`);
  }
  if (!value.scope) {
    if (value.kind === 'struct') value.scope = 'memory';
    else if (value.kind === 'log') value.scope = 'local';
    else value.scope = 'system';
  }
  if (!DIR_SCOPE.includes(value.scope)) {
    throw new Error(`Unknown scope directive: ${value.scope}`);
  }
  return value;
};

const check = (name, def, value) => {
  if (def.array) {
    let valid = Array.isArray(value);
    if (valid) {
      for (const element of value) {
        valid = typeof element === def.array;
        if (!valid) break;
      }
    }
    if (valid) return [];
    else return [`Field "${name}" expected to be array of ${def.array}`];
  }
  if (def.required && typeof value !== def.type) {
    return [`Field "${name}" is not of expected type: ${def.type}`];
  }
  if (def.length && value) {
    const len = value.toString().length;
    const { min, max } = def.length;
    if (min && len < min) {
      return [`Field "${name}" value is too short`];
    }
    if (max && len > max) {
      return [`Field "${name}" exceeds the maximum length`];
    }
  }
  return [];
};

class Schema {
  constructor(name, raw) {
    const scalar = typeof raw === 'string' || Reflect.has(raw, 'type');
    const defs = scalar ? { value: raw } : raw;
    this.name = name;
    this.scope = 'system';
    this.kind = scalar ? 'scalar' : 'entity';
    this.fields = {};
    this.indexes = {};
    this.validate = defs.validate || null;
    this.format = defs.format || null;
    this.parse = defs.parse || null;
    this.serialize = defs.serialize || null;
    this.preprocess(defs);
  }

  preprocess(defs) {
    const keys = Object.keys(defs);
    let first = true;
    for (const key of keys) {
      const value = defs[key];
      if (first && metautil.isFirstUpper(key)) {
        const { scope, kind } = parseDirective(value);
        this.scope = scope;
        this.kind = kind;
        continue;
      }
      first = false;
      const short = typeof value === 'string';
      const def = short ? { type: value } : value;
      const { array, set, map } = def;
      const typeName = array || set || map;
      if (typeof typeName !== 'string') {
        const { unique, index, primary } = def;
        const isIndex = Array.isArray(unique || index || primary);
        if (isIndex) {
          this.indexes[key] = def;
          continue;
        }
        if (!def.type) {
          this.fields[key] = Schema.from(def);
          continue;
        }
      }
      if (!Reflect.has(def, 'required')) def.required = true;
      if (def.length) {
        if (typeof def.length === 'number') {
          def.length = { max: def.length };
        } else if (Array.isArray(def.length)) {
          const [min, max] = def.length;
          def.length = { min, max };
        }
      }
      this.fields[key] = def;
    }
  }

  static from(raw) {
    return new Schema('', raw);
  }

  check(value) {
    const target = typeof value === 'object' ? value : { value };
    const keys = Object.keys(target);
    const fields = Object.keys(this.fields);
    const names = new Set([...keys, ...fields]);
    const errors = [];
    for (const name of names) {
      const value = target[name];
      const def = this.fields[name];
      if (def instanceof Schema) {
        const subcheck = def.check(value);
        if (!subcheck.valid) errors.push(...subcheck.errors);
        continue;
      }
      if (!def) {
        errors.push(`Field "${name}" is not expected`);
        continue;
      }
      if (def.required && !keys.includes(name)) {
        errors.push(`Field "${name}" is required`);
        continue;
      }
      const errs = check(name, def, value);
      if (errs.length > 0) errors.push(...errs);
    }
    return { valid: errors.length === 0, errors };
  }
}

module.exports = { Schema };
