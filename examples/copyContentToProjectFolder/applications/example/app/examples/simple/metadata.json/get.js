var meta = {
  description: "Test method description",
  par: {
    "par1:int": "Parameter #1",
    "par2:int": "Parameter #2"
  },
  result: "Returns JSON {a:1}"
};

module.exports = function(client, callback) {
  callback({ a:1 });
};

module.exports.meta = meta;