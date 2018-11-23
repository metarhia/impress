'use strict';

const CORE_PLUGINS = [
  'application', 'client',
  'security', 'state', 'cloud', 'health', 'firewall'
];

const plugins = {};
impress.plugins = plugins;

impress.loadPlugins = () => {
  for (let i = 0; i < CORE_PLUGINS.length; i++) {
    const pluginName = CORE_PLUGINS[i];
    const pluginPath = './' + pluginName + '.js';
    const plugin = require(pluginPath);
    plugins[pluginName] = plugin;
    if (plugin.mixinImpress) plugin.mixinImpress(impress);
  }
};

impress.mixinPlugins = application => {
  for (let i = 0; i < CORE_PLUGINS.length; i++) {
    const pluginName = CORE_PLUGINS[i];
    const plugin = plugins[pluginName];
    if (plugin.mixinApplication) {
      application[pluginName] = {};
      plugin.mixinApplication(application);
    }
  }
};
