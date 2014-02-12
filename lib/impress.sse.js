(function(impress) {

	impress.sse = {
		nextConnectionId: 1, // counter to be used as connection identifier
		channels: {},        // event channels indexed by channel name
		connections: {},     // all SSE connections
		statistics: {
			incoming: 0,     // incoming connection count from server start
			active: 0,       // active connection count
			disconnected: 0, // disconnected connection count from server start
			errors: 0        // connection error count from server start
		}
	}

	var initBuf = new Buffer(':\n\n', 'utf8');

	// Initialize SSE connection
	//
	impress.sse.connect = function(client) {
		var userId = (client.session && client.logged) ? client.application.sessions[client.session].userId.toHexString() : null;

		if (client.sse && client.sse.channel) {
			client.res.writeHead(200, {
				'Content-Type': impress.mimeTypes['sse'],
				'Cache-Control': 'no-cache',
				'Access-Control-Allow-Credentials': true,
				'Access-Control-Allow-Origin': '*'
			});
			client.req.socket.setTimeout(0);
			client.res.write(initBuf);

			var connectionId = impress.sse.nextConnectionId++;
			client.connectionId = connectionId;
			if (userId) {
				if (!client.application.users[userId].sse) client.application.users[userId].sse = {};
				client.application.users[userId].sse[connectionId] = client;
			}
			impress.sse.connections[connectionId] = client;

			if (!impress.sse.channels[client.sse.channel]) impress.sse.channels[client.sse.channel] = [];
			var channelUsers = impress.sse.channels[client.sse.channel];
			if (!inArray(channelUsers, userId)) channelUsers.push(userId);
			
			impress.sse.statistics.incoming++;
			impress.sse.statistics.active++;

			client.req.on('close', function() {
				delete impress.sse.connections[this.connectionId];
				impress.sse.statistics.active--;
				impress.sse.statistics.disconnected++;
			});

			client.req.on('error', function(err) {
				impress.sse.statistics.active--;
				impress.sse.statistics.disconnected++;
				impress.sse.statistics.errors++;
			});

			client.req.on('timeout',function() {
				impress.sse.statistics.active--;
				impress.sse.statistics.disconnected++;
				impress.sse.statistics.errors++;
			});

			client.req.socket.on('timeout',function() {
				impress.sse.statistics.active--;
				impress.sse.statistics.disconnected++;
				impress.sse.statistics.errors++;
			});
		} else client.error(403);
	}
	
	// Send event to all connections of given user
	//
	impress.sse.sendToUser = function(client, userId, eventName, data, isRetranslation) {
		var buf = impress.sse.packet(eventName, data),
			isRetranslation = isRetranslation || false;

		if (impress.cluster.isWorker && !isRetranslation) process.send({
			name: 'impress:event',
			node: impress.nodeId,
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
	}

	// Send event to all users in channel
	//
	impress.sse.sendToChannel = function(client, channel, eventName, data, isRetranslation) {
		var buf = impress.sse.packet(eventName, data),
			isRetranslation = isRetranslation || false;

		if (impress.cluster.isWorker && !isRetranslation) process.send({
			name: 'impress:event',
			node: impress.nodeId,
			channel: channel,
			event: eventName,
			data: data
		});

		if (impress.sse.channels[channel] && isRetranslation) {
			var users = impress.sse.channels[channel];
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
	}

	// Send event to all users in system
	//
	impress.sse.sendGlobal = function(client, eventName, data, isRetranslation) {
		var buf = impress.sse.packet(eventName, data),
			isRetranslation = isRetranslation || false;

		if (impress.cluster.isWorker && !isRetranslation) {
			process.send({
				name: 'impress:event',
				node: impress.nodeId,
				global: true,
				event: eventName,
				data: data
			});
		}

		for (var i in impress.sse.connections) impress.sse.connections[i].res.write(buf);
	}

	// Create SSE packet buffer
	//
	impress.sse.packet = function(eventName, data) {
		return new Buffer(
			'event: '+eventName+'\n'+
			'data: '+JSON.stringify(data)+'\n\n',
			'utf8'
		);
	}

} (global.impress = global.impress || {}));