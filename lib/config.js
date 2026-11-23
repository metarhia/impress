'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { isHashObject } = require('metautil');
const { loadSchema } = require('metaschema');

const CONFIG_SECTIONS = [
  'log',
  'scale',
  'server',
  'network',
  'lifecycle',
  'scheduler',
  'workers',
  'sessions',
];

const REQUIRED_SECTION = {
  network: true,
  lifecycle: true,
  scheduler: true,
  workers: true,
};

const MOVED_SERVER_KEYS = {
  nagle: 'network.js',
  queue: 'network.js',
  timeouts: 'network.js and lifecycle.js',
  scheduler: 'scheduler.js',
  workers: 'workers.js',
  services: 'server.js groups',
};

const ON_GROUP_KEYS = {
  host: true,
  ports: true,
  protocol: true,
  balancer: true,
  cors: true,
};

const GROUP_FIELDS = {
  host: true,
  ports: true,
  transports: true,
  protocols: true,
  tls: true,
  domains: true,
  application: true,
  balance: true,
  redirect: true,
  nagle: true,
  timeouts: true,
  queue: true,
  cors: true,
};

const PROTOCOLS = {
  'http/1.1': { transports: ['tcp'], named: true },
  h2: { transports: ['tcp'], named: true },
  'stun.turn': { transports: ['udp', 'tcp'], named: true },
  'stun.nat-discovery': { transports: ['udp', 'tcp'], named: true },
};

const BUILTIN_PROTOCOLS = {
  'http/1.1': true,
  h2: true,
};

const TIMEOUT_FIELDS = ['bind', 'request'];
const QUEUE_FIELDS = ['concurrency', 'size', 'timeout'];
const TRANSPORTS = ['tcp', 'udp'];
const PORT_MAX = 65535;

let configSchemas = null;

const isLegacyKey = (key) => {
  const moved = Object.hasOwn(MOVED_SERVER_KEYS, key);
  const onGroup = Object.hasOwn(ON_GROUP_KEYS, key);
  return moved || onGroup;
};

const GROUP_MARKS = {
  ports: true,
  protocols: true,
  transports: true,
  tls: true,
  domains: true,
  application: true,
  balance: true,
  redirect: true,
};

const isGroupValue = (value) => {
  if (!isHashObject(value)) return false;
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    if (Object.hasOwn(GROUP_MARKS, keys[i])) return true;
  }
  return false;
};

const isPort = (value) => {
  const integer = Number.isInteger(value);
  const inRange = value >= 0 && value <= PORT_MAX;
  return integer && inRange;
};

const groupWhere = (name, loc) => `in group "${name}" in ${loc}`;

const hasNumbers = (value, fields) => {
  if (!isHashObject(value)) return false;
  for (let i = 0; i < fields.length; i++) {
    if (typeof value[fields[i]] !== 'number') return false;
  }
  return true;
};

const stringList = (value) => {
  if (!Array.isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') return false;
  }
  return true;
};

const defaultTransports = (protocols) => {
  const list = [];
  for (let i = 0; i < protocols.length; i++) {
    const known = PROTOCOLS[protocols[i]];
    if (!known) continue;
    const transports = known.transports;
    for (let j = 0; j < transports.length; j++) {
      const transport = transports[j];
      if (list.includes(transport)) continue;
      list.push(transport);
    }
  }
  return list;
};

const namedProtocol = (protocols) => {
  for (let i = 0; i < protocols.length; i++) {
    const known = PROTOCOLS[protocols[i]];
    if (known && known.named) return true;
  }
  return false;
};

const httpProtocol = (protocols) => {
  for (let i = 0; i < protocols.length; i++) {
    if (Object.hasOwn(BUILTIN_PROTOCOLS, protocols[i])) return true;
  }
  return false;
};

const readJson = (file) => {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return JSON.parse(text);
  } catch {
    // ignore
    return null;
  }
};

const protocolsOf = (pkg) => {
  const meta = pkg.metarhia;
  if (!isHashObject(meta)) return [];
  const listed = meta.protocols;
  if (!Array.isArray(listed)) return [];
  const protocols = [];
  for (let i = 0; i < listed.length; i++) {
    const id = listed[i];
    const usable = typeof id === 'string' && id !== '';
    if (!usable || protocols.includes(id)) continue;
    protocols.push(id);
  }
  return protocols;
};

const addOwner = (owners, id, name) => {
  const current = owners.get(id);
  if (current) {
    current.push(name);
    return;
  }
  owners.set(id, [name]);
};

const loadProviders = (root) => {
  const providers = [];
  const owners = new Map();
  const file = path.join(root, 'package.json');
  const app = readJson(file);
  const declared = app && isHashObject(app.dependencies);
  const names = declared ? Object.keys(app.dependencies) : [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const pkgFile = path.join(root, 'node_modules', name, 'package.json');
    const pkg = readJson(pkgFile);
    if (!pkg) continue;
    const protocols = protocolsOf(pkg);
    if (protocols.length === 0) continue;
    providers.push({ name, protocols });
    for (let j = 0; j < protocols.length; j++) {
      addOwner(owners, protocols[j], name);
    }
  }
  return { providers, owners };
};

const quoteList = (names) => {
  let text = '';
  for (let i = 0; i < names.length; i++) {
    if (i > 0) text += ' and ';
    text += `"${names[i]}"`;
  }
  return text;
};

const providerMessages = (owners) => {
  const messages = [];
  for (const id of owners.keys()) {
    const names = owners.get(id);
    if (names.length < 2) continue;
    const who = quoteList(names);
    const text = `Protocol "${id}" is provided by ${who} in package.json`;
    messages.push(text);
  }
  return messages;
};

const providerCount = (owners, id) => {
  const names = owners.get(id);
  if (!names) return 0;
  return names.length;
};

const overlaps = (groupProtocols, provided) => {
  const ids = [];
  for (let i = 0; i < provided.length; i++) {
    const id = provided[i];
    if (Object.hasOwn(BUILTIN_PROTOCOLS, id)) continue;
    if (!groupProtocols.includes(id)) continue;
    ids.push(id);
  }
  return ids;
};

const assignProviders = (threads, providers) => {
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const matched = [];
    for (let j = 0; j < threads.length; j++) {
      const thread = threads[j];
      if (thread.balance) continue;
      const protocols = overlaps(thread.protocols, provider.protocols);
      if (protocols.length === 0) continue;
      matched.push({ thread, protocols });
    }
    const count = matched.length;
    for (let j = 0; j < count; j++) {
      const item = matched[j];
      const name = provider.name;
      const protocols = item.protocols;
      const index = j;
      const record = { name, protocols, index, count };
      item.thread.providers.push(record);
    }
  }
};

const resolveApplication = (group) => {
  if (typeof group.application === 'boolean') return group.application;
  const protocols = group.protocols;
  const routed = group.balance !== undefined || group.redirect !== undefined;
  if (!Array.isArray(protocols)) return false;
  return httpProtocol(protocols) && !routed;
};

const legacyMessage = (key, loc) => {
  if (Object.hasOwn(MOVED_SERVER_KEYS, key)) {
    const target = MOVED_SERVER_KEYS[key];
    return `${key} moved to ${target} in ${loc}`;
  }
  return `${key} belongs on a group in ${loc}`;
};

const unknownFields = (group, where, messages) => {
  const keys = Object.keys(group);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (Object.hasOwn(GROUP_FIELDS, key)) continue;
    messages.push(`Field "${key}" is not expected ${where}`);
  }
};

const portList = (entry) => {
  if (isPort(entry)) return [entry];
  if (!Array.isArray(entry) || entry.length === 0) return null;
  for (let i = 0; i < entry.length; i++) {
    if (!isPort(entry[i])) return null;
  }
  return entry;
};

const collectPorts = (group, name, loc, seen, messages) => {
  const where = groupWhere(name, loc);
  const entries = group.ports;
  if (!Array.isArray(entries) || entries.length === 0) {
    messages.push(`ports is required ${where}`);
    return;
  }
  for (let i = 0; i < entries.length; i++) {
    const ports = portList(entries[i]);
    if (!ports) {
      const text = 'ports entry must be a port or an array of ports';
      messages.push(`${text} ${where}`);
      continue;
    }
    for (let j = 0; j < ports.length; j++) {
      const port = ports[j];
      if (seen.has(port)) {
        messages.push(`Port ${port} is repeated ${where}`);
        continue;
      }
      seen.add(port);
    }
  }
};

const readProtocols = (group, where, owners, messages) => {
  const protocols = group.protocols;
  if (!Array.isArray(protocols) || protocols.length === 0) {
    messages.push(`protocols is required ${where}`);
    return [];
  }
  for (let i = 0; i < protocols.length; i++) {
    const id = protocols[i];
    const label = typeof id === 'string' ? id : `${id}`;
    if (typeof id !== 'string' || id === '') {
      messages.push(`Unknown protocol "${label}" ${where}`);
      continue;
    }
    if (Object.hasOwn(BUILTIN_PROTOCOLS, id)) continue;
    const count = providerCount(owners, id);
    if (count > 0) continue;
    if (Object.hasOwn(PROTOCOLS, id)) {
      const text = `No provider for protocol "${id}"`;
      messages.push(`${text} ${where}`);
      continue;
    }
    messages.push(`Unknown protocol "${label}" ${where}`);
  }
  return protocols;
};

const readTransports = (group, protocols, where, messages) => {
  if (group.transports === undefined) return defaultTransports(protocols);
  const list = group.transports;
  if (!Array.isArray(list) || list.length === 0) {
    messages.push(`transports must list tcp or udp ${where}`);
    return [];
  }
  for (let i = 0; i < list.length; i++) {
    const id = list[i];
    if (TRANSPORTS.includes(id)) continue;
    messages.push(`Unknown transport "${id}" ${where}`);
  }
  return list;
};

const checkTls = (group, transports, protocols, where, messages) => {
  if (group.tls !== undefined && typeof group.tls !== 'boolean') {
    messages.push(`tls must be boolean ${where}`);
  }
  const tcp = transports.includes('tcp');
  if (group.tls === true && !tcp) {
    messages.push(`tls requires tcp ${where}`);
  }
  if (group.domains === undefined) return;
  if (!tcp) messages.push(`domains requires tcp ${where}`);
  if (!namedProtocol(protocols)) {
    messages.push(`domains requires a named protocol ${where}`);
  }
  if (!stringList(group.domains)) {
    messages.push(`domains must be an array of strings ${where}`);
  }
};

const isGroup = (server, name) => {
  if (!Object.hasOwn(server, name)) return false;
  const value = server[name];
  if (isLegacyKey(name) && !isGroupValue(value)) return false;
  return isHashObject(value);
};

const checkLinks = (group, server, where, messages) => {
  const balance = group.balance;
  const redirect = group.redirect;
  const hasBalance = balance !== undefined;
  const hasRedirect = redirect !== undefined;
  if (hasBalance && hasRedirect) {
    const text = 'balance and redirect cannot be combined';
    messages.push(`${text} ${where}`);
  }
  if (hasBalance && typeof balance !== 'string') {
    messages.push(`balance must name a group ${where}`);
  }
  if (typeof balance === 'string' && !isGroup(server, balance)) {
    messages.push(`Unknown balance target "${balance}" ${where}`);
  }
  if (!hasRedirect || redirect === 'https') return;
  messages.push(`Unknown redirect "${redirect}" ${where}`);
};

const checkScalars = (group, where, messages) => {
  if (group.host !== undefined && typeof group.host !== 'string') {
    messages.push(`host must be a string ${where}`);
  }
  const application = group.application;
  if (application !== undefined && typeof application !== 'boolean') {
    messages.push(`application must be boolean ${where}`);
  }
  if (group.nagle !== undefined && typeof group.nagle !== 'boolean') {
    messages.push(`nagle must be boolean ${where}`);
  }
  const timeouts = group.timeouts;
  const queue = group.queue;
  if (timeouts !== undefined && !hasNumbers(timeouts, TIMEOUT_FIELDS)) {
    messages.push(`timeouts must set bind and request ${where}`);
  }
  if (queue !== undefined && !hasNumbers(queue, QUEUE_FIELDS)) {
    const text = 'queue must set concurrency, size, and timeout';
    messages.push(`${text} ${where}`);
  }
  if (group.cors === undefined) return;
  if (!isHashObject(group.cors)) {
    messages.push(`cors must be an object ${where}`);
    return;
  }
  const origin = group.cors.origin;
  if (origin !== undefined && typeof origin !== 'string') {
    messages.push(`cors.origin must be a string ${where}`);
  }
};

const groupMessages = (name, group, server, seen, loc, owners) => {
  const where = groupWhere(name, loc);
  if (!isHashObject(group)) {
    return [`group "${name}" must be an object in ${loc}`];
  }
  const messages = [];
  unknownFields(group, where, messages);
  const protocols = readProtocols(group, where, owners, messages);
  const transports = readTransports(group, protocols, where, messages);
  collectPorts(group, name, loc, seen, messages);
  checkTls(group, transports, protocols, where, messages);
  checkLinks(group, server, where, messages);
  checkScalars(group, where, messages);
  return messages;
};

const serverConfigErrors = (data, loc, owners) => {
  if (data === undefined || data === null) return [];
  if (!isHashObject(data)) {
    return [`server.js must define groups in ${loc}`];
  }
  const messages = [];
  const seen = new Set();
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (isLegacyKey(key) && !isGroupValue(data[key])) {
      messages.push(legacyMessage(key, loc));
      continue;
    }
    const found = groupMessages(key, data[key], data, seen, loc, owners);
    for (let j = 0; j < found.length; j++) messages.push(found[j]);
  }
  return messages;
};

const flattenPorts = (entries) => {
  const ports = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (typeof entry === 'number') {
      ports.push(entry);
      continue;
    }
    for (let j = 0; j < entry.length; j++) ports.push(entry[j]);
  }
  return ports;
};

const normalizeGroup = (name, group, network) => {
  const protocols = group.protocols.slice();
  const explicit = group.transports;
  const transports = explicit ? explicit.slice() : defaultTransports(protocols);
  const host = group.host ?? '0.0.0.0';
  const tls = group.tls === true;
  const listed = group.domains;
  const domains = Array.isArray(listed) ? listed.slice() : [];
  const application = resolveApplication(group);
  const cors = group.cors ?? null;
  const nagle = group.nagle ?? network.nagle;
  const timeouts = group.timeouts ?? network.timeouts;
  const queue = group.queue ?? network.queue;
  const balance = group.balance ?? null;
  const redirect = group.redirect ?? null;
  return {
    name,
    host,
    ports: group.ports,
    protocols,
    transports,
    tls,
    domains,
    application,
    cors,
    nagle,
    timeouts,
    queue,
    balance,
    redirect,
  };
};

const threadOf = (group, ports, target, runTests) => {
  const loads = group.application && group.balance === null;
  return {
    group: group.name,
    ports,
    protocols: group.protocols,
    transports: group.transports,
    tls: group.tls,
    domains: group.domains,
    host: group.host,
    cors: group.cors,
    nagle: group.nagle,
    timeouts: group.timeouts,
    queue: group.queue,
    application: loads,
    balance: group.balance,
    redirect: group.redirect,
    runTests,
    target,
    providers: [],
  };
};

const planThreads = (server, network, providers = []) => {
  const source = isHashObject(server) ? server : {};
  const groups = new Map();
  const names = [];
  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (isLegacyKey(key) && !isGroupValue(source[key])) continue;
    const group = normalizeGroup(key, source[key], network);
    groups.set(key, group);
    names.push(key);
  }
  const threads = [];
  let testsAssigned = false;
  for (let i = 0; i < names.length; i++) {
    const group = groups.get(names[i]);
    const entries = group.ports;
    let target = null;
    if (group.balance) {
      const balanced = groups.get(group.balance);
      const protocol = balanced.tls ? 'https' : 'http';
      target = { protocol, ports: flattenPorts(balanced.ports) };
    }
    for (let j = 0; j < entries.length; j++) {
      const entry = entries[j];
      const ports = typeof entry === 'number' ? [entry] : entry.slice();
      const loads = group.application && group.balance === null;
      const runTests = loads && !testsAssigned;
      if (runTests) testsAssigned = true;
      threads.push(threadOf(group, ports, target, runTests));
    }
  }
  assignProviders(threads, providers);
  return threads;
};

const isAbsent = (data) => data === undefined || data === null;

const loadConfigSchemas = (root) => {
  const schemaPath = path.join(root, 'schemas/config');
  const load = (section) => loadSchema(path.join(schemaPath, `${section}.js`));
  return Promise.all(CONFIG_SECTIONS.map(load));
};

const collectConfigErrors = async (config, root, discovered = null) => {
  if (!configSchemas) configSchemas = loadConfigSchemas(root);
  const schemas = await configSchemas;
  const foundProviders = discovered ?? loadProviders(process.cwd());
  const owners = foundProviders.owners;
  const messages = [];
  for (let i = 0; i < CONFIG_SECTIONS.length; i++) {
    const section = CONFIG_SECTIONS[i];
    const loc = `application/config/${section}.js`;
    const data = config[section];
    if (section === 'server') {
      const conflicts = providerMessages(owners);
      for (let j = 0; j < conflicts.length; j++) messages.push(conflicts[j]);
      const found = serverConfigErrors(data, loc, owners);
      for (let j = 0; j < found.length; j++) messages.push(found[j]);
      continue;
    }
    const required = Object.hasOwn(REQUIRED_SECTION, section);
    if (required && isAbsent(data)) {
      messages.push(`${section}.js is required in ${loc}`);
      continue;
    }
    const checkResult = schemas[i].check(data);
    if (checkResult.valid) continue;
    const errors = checkResult.errors;
    for (let j = 0; j < errors.length; j++) {
      messages.push(`${errors[j]} in ${loc}`);
    }
  }
  return messages;
};

module.exports = {
  CONFIG_SECTIONS,
  loadProviders,
  planThreads,
  collectConfigErrors,
};
