module.exports = function(client, callback) {
  var appNs = Object.keys(application),
      cliNs = Object.keys(client),
      apiNs = Object.keys(api),
      globalNs = Object.keys(global);

  callback({
    application: 'application.' + appNs.join('\napplication.'),
    client: 'client.' + cliNs.join('\nclient.'),
    api: 'api.' + apiNs.join('\napi.'),
    global: globalNs.join('\n')
  });
};
