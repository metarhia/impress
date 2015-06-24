var meta = {
  description: 'Test method description for POST',
  parameters: {
    par1: 'number    // Parameter #1',
    par2: '5:number  // Parameter #2',
    par3: '[string]  // Parameter #3',
    par4: '[number]  // Parameter #4'
  },
  result: 'Returns JSON { success: true/false }'
};

module.exports = function(client, callback) {
  callback({ success:true });
};

module.exports.meta = meta;
