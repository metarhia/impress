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
	impress.sse.connect = function(req, res) {
		var userId = (req.impress.session && req.impress.logged)
			? impress.sessions[req.impress.session].userId.toHexString() : null;

		if (res.sse && res.sse.channel) {
			res.writeHead(200, {
				'Content-Type': impress.mimeTypes['sse'],
				'Cache-Control': 'no-cache',
				'Access-Control-Allow-Credentials': true,
				'Access-Control-Allow-Origin': '*'
			});
			req.socket.setTimeout(0);
			res.write(initBuf);

			var connectionId = impress.sse.nextConnectionId++;
			req.impress.connectionId = connectionId;
			res.impress.connectionId = connectionId;
			if (userId) {
				if (!impress.users[userId].sse) impress.users[userId].sse = {};
				impress.users[userId].sse[connectionId] = { request: req, response: res };
			}
			impress.sse.connections[connectionId] = res;

			if (!impress.sse.channels[res.sse.channel]) impress.sse.channels[res.sse.channel] = [];
			var channelUsers = impress.sse.channels[res.sse.channel];
			if (!inArray(channelUsers, userId)) channelUsers.push(userId);
			
			impress.sse.statistics.incoming++;
			impress.sse.statistics.active++;

			req.on('close', function() {
				delete impress.sse.connections[this.connectionId];
				impress.sse.statistics.active--;
				impress.sse.statistics.disconnected++;
			});

			req.on('error', function(err) {
				impress.sse.statistics.active--;
				impress.sse.statistics.disconnected++;
				impress.sse.statistics.errors++;
			});

			req.on('timeout',function() {
				impress.sse.statistics.active--;
				impress.sse.statistics.disconnected++;
				impress.sse.statistics.errors++;
			});

			req.socket.on('timeout',function() {
				impress.sse.statistics.active--;
				impress.sse.statistics.disconnected++;
				impress.sse.statistics.errors++;
			});
		} else impress.error(req, res, 403);
	}
	
	// Send event to all connections of given user
	//
	impress.sse.sendToUser = function(userId, eventName, data, isRetranslation) {
		var buf = impress.sse.packet(eventName, data),
			isRetranslation = isRetranslation || false;

		if (impress.cluster.isWorker && !isRetranslation) process.send({
			name: 'impress:event',
			node: impress.nodeId,
			user: userId,
			event: eventName,
			data: data
		});

		if (impress.users[userId] && impress.users[userId].sse) {
			for (var i in impress.users[userId].sse) impress.users[userId].sse[i].response.write(buf);
		}
	}

	// Send event to all users in channel
	//
	impress.sse.sendToChannel = function(channel, eventName, data, isRetranslation) {
		var buf = impress.sse.packet(eventName, data),
			isRetranslation = isRetranslation || false;

		if (impress.cluster.isWorker && !isRetranslation) process.send({
			name: 'impress:event',
			node: impress.nodeId,
			channel: channel,
			event: eventName,
			data: data
		});

		if (impress.sse.channels[channel], isRetranslation) {
			var users = impress.sse.channels[channel];
			for (var j in users) {
				var userId = users[j];
				if (impress.users[userId] && impress.users[userId].sse) {
					for (var i in impress.users[userId].sse) {
						impress.users[userId].sse[i].response.write(buf);
					}
				}
			}
		}
	}

	// Send event to all users in system
	//
	impress.sse.sendGlobal = function(eventName, data, isRetranslation) {
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

		for (var i in impress.sse.connections) impress.sse.connections[i].write(buf);
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