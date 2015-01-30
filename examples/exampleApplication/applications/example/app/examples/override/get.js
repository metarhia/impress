module.exports = function(client, callback) {
  console.log('/over before inherited');
  client.inherited(function() {
    console.log('/over after inherited');
    callback();
  });
};
