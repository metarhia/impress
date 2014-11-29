"use strict";

var aliases = {
  'geoip': 'geoip-lite',
  'zipstream': 'zip-stream',
  'stringify': 'json-stringify-safe'
};

var alias, moduleName, module;
for (alias in aliases) {
  moduleName = aliases[alias];
  module = impress.require(moduleName);
  if (module) api[alias] = module;
}
