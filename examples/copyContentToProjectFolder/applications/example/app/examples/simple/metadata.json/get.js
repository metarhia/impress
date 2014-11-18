var meta = {
  description: "Test method description",
  parameters: {
    "par1": "number   // Parameter #1",
    "par2": "5:string // Parameter #2",
  },
  result: "Returns JSON {a:1}"
};

module.exports = function(client, callback) {
  callback({ a:1 });
};

module.exports.meta = meta;
