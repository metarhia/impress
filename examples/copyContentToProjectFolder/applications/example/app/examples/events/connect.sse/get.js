module.exports = function(client, callback) {

	client.sse.channel = 'TestEvent';
	callback();

}