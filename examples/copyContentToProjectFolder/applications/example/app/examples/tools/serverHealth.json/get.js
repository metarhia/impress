module.exports = function(client, callback) {

	application.leak = application.leak || [];
	var n = application.leak.length ? application.leak.length : 0;
	application.leak.push(new Array(1024*(1024/n+1)).join("Hello node.js, Hello Impress Application Server "));

	callback({
		memory: process.memoryUsage()
	});

}