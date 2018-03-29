'use strict';

const CORE_PLUGINS = [
  'log', 'cache', 'application', // pugins
  'client', 'index', 'files', 'templating', 'preprocess',
  'security', 'state', 'cloud', 'jstp',
  'sse', 'websocket', 'health', 'firewall'
];

const plugins = {};
impress.plugins = plugins;

impress.loadPlugins = () => {
  let i, plugin, pluginName, pluginPath;
  const len = CORE_PLUGINS.length;
  for (i = 0; i < len; i++) {
    pluginName = CORE_PLUGINS[i];
    pluginPath = './' + pluginName;
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
