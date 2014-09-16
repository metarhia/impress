var meta = {
  description: "Test method description for POST",
  par: {
    "par1:int": "Parameter #1",
    "par2:int": "Parameter #2",
    "par3:int": "Parameter #3",
    "par4:int": "Parameter #4"
  },
  result: "Returns JSON { success: true/false }"
};

module.exports = function(client, callback) {
  callback({ success:true });
};

module.exports.meta = meta;