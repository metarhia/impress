(function(impress) {

	var websocket = impress.require("websocket");

	if (websocket) {
		impress.websocket = websocket;

		impress.websocket.upgradeServer = function(server) {
			server.webSocketServer = new websocket.server({
				httpServer: server,
				autoAcceptConnections: false
			});
			server.webSocketServer.on('request', function(request) {
				var req = request.httpRequest,
					res = request.socket;
				res.websocket = {};
				res.websocket.request = request;
				res.websocket.accept = function() {
					res.websocket.isAccepted = true;
					var connection = request.accept('', request.origin);
					return connection;
				}
				impress.dispatcher(req, res);
			});
		}

		impress.websocket.finalize = function(req, res) {
			if (res.websocket && !res.websocket.isAccepted) {
				res.websocket.request.reject();
			}
		}
	}

} (global.impress = global.impress || {}));