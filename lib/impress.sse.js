(function(impress) {

	// Initialize SSE connection
	//
	impress.sse = function(req, res) {
		var userId = (req.impress.session && req.impress.logged)
			? impress.sessions[req.impress.session].userId.toHexString() : null;
		if (userId && res.sse && res.sse.channel) {
			//console.log('SSE: incoming connection');
			res.writeHead(200, {
				'Content-Type': impress.mimeTypes['sse'],
				'Cache-Control': 'no-cache',
				'Access-Control-Allow-Credentials': true,
				'Access-Control-Allow-Origin': '*'
			});
			req.socket.setTimeout(0);
			res.write(':connected');
			if (!impress.users[userId].sse) impress.users[userId].sse = {};
			req.impress._id = impress.events._counter;
			res.impress._id = impress.events._counter;
			impress.users[userId].sse[impress.events._counter] = { request: req, response: res };
			impress.events._counter++;

			if (!impress.events.channels[res.sse.channel]) impress.events.channels[res.sse.channel] = [];
			var channelUsers = impress.events.channels[res.sse.channel];
			if (!inArray(channelUsers, userId)) channelUsers.push(userId);
			
			impress.events.statistics.incoming++;
			impress.events.statistics.active++;

			req.on('close', function() {
				//console.log('SSE: socket close');
				impress.events.statistics.active--;
				impress.events.statistics.disconnected++;
			});

			req.on('error', function(err) {
				//console.log('SSE: socket error');
				impress.events.statistics.active--;
				impress.events.statistics.disconnected++;
				impress.events.statistics.errors++;
			});

			req.on('timeout',function() {
				//console.log('SSE: timeout');
				impress.events.statistics.active--;
				impress.events.statistics.disconnected++;
				impress.events.statistics.errors++;
			});

			req.socket.on('timeout',function() {
				//console.log('SSE: socket timeout');
				impress.events.statistics.active--;
				impress.events.statistics.disconnected++;
				impress.events.statistics.errors++;
			});
		} else impress.error(req, res, 403);
	}

} (global.impress = global.impress || {}));