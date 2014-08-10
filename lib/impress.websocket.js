"use strict";

var websocket = impress.require("websocket");

if (websocket) {

	api.websocket = websocket;
	impress.websocket = {};

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
			};
			impress.dispatcher(req, res);
		});
	};

	impress.websocket.mixinApplication = function (application) {

		application.websocket = {};

		application.Client.prototype.websocket = {};

		application.Client.prototype.websocket.finalize = function() {
			if (this.res.websocket && !this.res.websocket.isAccepted) this.res.websocket.request.reject();
		};

	}	

}