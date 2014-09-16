module.exports = function(client, callback) {

  application.stateTest = application.stateTest || { counter: 0, addresses: [] };
  application.stateTest.counter++;

  var st = application.stateTest,
    ip = client.req.connection.remoteAddress;

  if (st.addresses.indexOf(ip) == -1) st.addresses.push(ip);

  callback(st);

}