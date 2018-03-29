'use strict';

const CORE_PLUGINS = [
  'log', 'cache', 'application', 'client', 'preprocess',
  'security', 'state', 'cloud', 'health', 'firewall',
  'jstp', 'sse', 'websocket'
];

const plugins = {};
impress.plugins = plugins;

impress.loadPlugins = () => {
  let i, plugin, pluginName, pluginPath;
  const len = CORE_PLUGINS.length;
  for (i = 0; i < len; i++) {
    pluginName = CORE_PLUGINS[i];
    pluginPath = './' + pluginName + '.js';
    plugin = require(pluginPath);
    plugins[pluginName] = plugin;
    if (plugin.mixinImpress) plugin.mixinImpress(impress);
  }
};

impress.mixinPlugins = (application) => {
  let i, plugin, pluginName;
  const len = CORE_PLUGINS.length;
  for (i = 0; i < len; i++) {
    pluginName = CORE_PLUGINS[i];
    plugin = plugins[pluginName];
    application[pluginName] = {};
    if (plugin.mixinApplication) plugin.mixinApplication(application);
  }
};
