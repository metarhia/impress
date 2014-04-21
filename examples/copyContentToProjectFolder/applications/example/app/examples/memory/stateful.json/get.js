module.exports = function(client, callback) {

	application.stateTest = application.stateTest || { counter: 0, addresses: [] };
	application.stateTest.counter++;
	application.stateTest.addresses.push(client.req.connection.remoteAddress);
	client.context.data = application.stateTest;
	callback();

}