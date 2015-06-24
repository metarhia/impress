var meta = {
  description: 'Test method description',
  parameters: {
    par1: '[number] // Parameter #1',
    par2: 'abc:string // Parameter #2',
    par3: '8:number // Parameter #3'
  },
  result: 'Returns JSON { parameters: client.parameters }'
};

module.exports = function(client, callback) {
  callback({ parameters: client.parameters });
};

module.exports.meta = meta;
