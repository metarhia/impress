module.exports = function(client, callback) {

  client.context.data = { Result: "Ok" };
  security.signOut(client, callback);

}