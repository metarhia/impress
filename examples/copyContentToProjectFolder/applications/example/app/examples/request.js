module.exports = function(client, callback) {

  client.context.data = { defaultResult: "should be inherited or overridden" };
  callback();

}