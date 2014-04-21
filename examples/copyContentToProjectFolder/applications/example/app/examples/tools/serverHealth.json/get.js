module.exports = function(client, callback) {

	client.application.leak = client.application.leak || [];
	var n = client.application.leak.length ? client.application.leak.length : 0;
	client.application.leak.push(new Array(1024*(1024/n+1)).join("Hello node.js, Hello Impress Application Server "));

	client.context.data = {
		memory: process.memoryUsage()
	};
	callback();

}