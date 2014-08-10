"use strict";

impress.sse = {};

var initBuf = new Buffer(':\n\n', 'utf8');

impress.sse.mixinApplication = function (application) {

	application.sse = {
		nextConnectionId: 1, // counter to be used as connection identifier
		channels: {},        // event channels indexed by channel name
		connections: {},     // all SSE connections
		statistics: {
			incoming: 0,     // incoming connection count from server start
			active: 0,       // active connection count
			disconnected: 0, // disconnected connection count from server start
			errors: 0        // connection error count from server start
		}
	};

	application.Client.prototype.sse = {};

	// Initialize SSE connection
	//
	application.Client.prototype.sseConnect = function() {
		var client = this;
		var userId = (client.session && client.logged) ? client.application.sessions[client.session].userId.toHexString() : null;

		if (client.sse.channel && !client.res.headersSent) {
			client.res.writeHead(200, {
				'Content-Type': impress.mimeTypes['sse'],
				'Cache-Control': 'no-cache',
				'Access-Control-Allow-Credentials': true,
				'Access-Control-Allow-Origin': '*'
			});
			client.req.socket.setTimeout(0);
			client.res.write(initBuf);

			var connectionId = application.sse.nextConnectionId++;
			client.sse.connectionId = connectionId;

			if (userId) {
				if (!client.application.users[userId].sse) client.application.users[userId].sse = {};
				client.application.users[userId].sse[connectionId] = client;
			}
			application.sse.connections[connectionId] = client;

			if (!application.sse.channels[client.sse.channel]) application.sse.channels[client.sse.channel] = [];
			var channelUsers = application.sse.channels[client.sse.channel];
			if (!inArray(channelUsers, userId)) channelUsers.push(userId);

			application.sse.statistics.incoming++;
			application.sse.statistics.active++;

			client.req.on('close', function() {
				delete application.sse.connections[connectionId];
				application.sse.statistics.active--;
				application.sse.statistics.disconnected++;
			});

			client.req.on('error', function(err) {
				application.sse.statistics.active--;
				application.sse.statistics.disconnected++;
				application.sse.statistics.errors++;
			});

			client.req.on('timeout',function() {
				application.sse.statistics.active--;
				application.sse.statistics.disconnected++;
				application.sse.statistics.errors++;
			});

			client.req.socket.on('timeout',function() {
				application.sse.statistics.active--;
				application.sse.statistics.disconnected++;
				application.sse.statistics.errors++;
			});
		} else client.error(403);
	};

	// Send event to all connections of given user
	//
	application.sse.sendToUser = function(client, userId, eventName, data, isRetranslation) {
		var buf = impress.sse.packet(eventName, data);
		isRetranslation = isRetranslation || false;

		if (api.cluster.isWorker && !isRetranslation) process.send({
			name: 'impress:event',
			node: impress.nodeId,
			appName: application.name,
			user: userId,
			event: eventName,
			data: data
		});
	
		for (var appName in impress.applications) {
			var application = impress.applications[appName];
			if (application.users[userId] && application.users[userId].sse) {
				for (var i in application.users[userId].sse) application.users[userId].sse[i].res.write(buf);
			}
		}
	};

	// Send event to all users in channel
	//
	application.sse.sendToChannel = function(client, channel, eventName, data, isRetranslation) {
		var buf = impress.sse.packet(eventName, data),
			isRetranslation = isRetranslation || false;

		if (api.cluster.isWorker && !isRetranslation) process.send({
			name: 'impress:event',
			node: impress.nodeId,
			appName: application.name,
			channel: channel,
			event: eventName,
			data: data
		});

		if (application.sse.channels[channel] && isRetranslation) {
			var users = application.sse.channels[channel];
			for (var j in users) {
				var userId = users[j];
				for (var appName in impress.applications) {
					var application = impress.applications[appName];
					if (application.users[userId] && application.users[userId].sse) {
						for (var i in application.users[userId].sse) application.users[userId].sse[i].res.write(buf);
					}
				}
			}
		}
	};

	// Send event to all users in system
	//
	application.sse.sendGlobal = function(client, eventName, data, isRetranslation) {
		var buf = impress.sse.packet(eventName, data);
		isRetranslation = isRetranslation || false;

		if (api.cluster.isWorker && !isRetranslation) {
			process.send({
				name: 'impress:event',
				node: impress.nodeId,
				appName: application.name,
				global: true,
				event: eventName,
				data: data
			});
		}

		for (var i in application.sse.connections) application.sse.connections[i].res.write(buf);
	};

}

// Create SSE packet buffer
//
impress.sse.packet = function(eventName, data) {
	return new Buffer(
		'event: '+eventName+'\n'+
		'data: '+JSON.stringify(data)+'\n\n',
		'utf8'
	);
};
