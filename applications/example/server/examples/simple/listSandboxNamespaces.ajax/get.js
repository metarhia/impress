module.exports = function(client, callback) {

  var namespaces = {
    global: global,
    application: application,
    client: client,
    api: api,
  };

  function serialize(name) {
    var obj = this[name];
    if (Array.isArray(obj)) return name + ': ' + JSON.stringify(obj).replace(/"/g, '\'');
    else return name + ': ' + api.util.inspect(obj, { depth: 0 }).replace(/{ /, '{\n  ');
  }

  var name, obj, keys, def,
      result = '';
  for (name in namespaces) {
    obj = namespaces[name];
    keys = Object.keys(obj);
    def = keys.map(serialize, obj);
    result += '<h2>' + name + '</h2><br>' + name + '.' + def.join('\n' + name + '.') + '<br>';
  }

  callback({ txt: result });
};
