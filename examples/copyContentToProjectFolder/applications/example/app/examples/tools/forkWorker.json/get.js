module.exports = function(client, callback) {

	client.context.data = {
		parameterName: "parameterValue",
		arrayName: [ "arrayItem1", "arrayItem2", "arrayItem3" ]
	};
	client.fork('worker');
	callback();

}