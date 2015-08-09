module.exports = function(client, callback) {
  var appNs = Object.keys(application),
      cliNs = Object.keys(client),
      apiNs = Object.keys(api),
      globalNs = Object.keys(global);

  function serialize(name) {
    var obj = this[name];
    if (Array.isArray(obj)) return name + ': ' + JSON.stringify(obj).replace(/"/g, '\'');
    else return name + ': ' + api.util.inspect(obj, { depth: 0 }).replace(/{ /, '{\n  ');
  }

  var appObj = appNs.map(serialize, application),
      cliObj = cliNs.map(serialize, client),
      apiObj = apiNs.map(serialize, api),
      globalObj = globalNs.map(serialize, global);

  callback({
    application: 'application.' + appObj.join('\napplication.'),
    client: 'client.' + cliObj.join('\nclient.'),
    api: 'api.' + apiObj.join('\napi.'),
    global: globalObj.join('\n')
  });
};
