(function(impress) {

	var zmq = impress.require('zmq');

	if (zmq) {
		impress.zmq = impress.require('zmq');
		impress.cloud = {};
		impress.cloud.type = "standalone"; // standalone, controller, server, balancer, brocker
		impress.cloud.status = "online";   // sleep, online, offline, updating, error, maintenance

		// Init connection to cloud controller
		//
		impress.cloud.init = function() {
			if (impress.cluster.isMaster && impress.config.cloud) {
				var cc = impress.config.cloud;
				if (cc.type == "controller") {

					console.log('Starting cloud controller...'.bold.green);

					// ZeroMQ publisher socket
					//
					impress.cloud.pub = impress.zmq.socket('pub');
					impress.cloud.pub.bind(cc.addrPubSub, function(err) {
						if (err) console.log(err)
						else console.log('  zmq publisher '+cc.addrPubSub);
					});

					// ZeroMQ reply socket
					//
					impress.cloud.rep = impress.zmq.socket('rep');
					impress.cloud.rep.on('message', function(request) {
						//console.log("Received request: [", request.toString(), "]");
						impress.cloud.rep.send("ok");
						impress.cloud.pub.send(request.toString());
					});
					impress.cloud.rep.bind(cc.addrReqRes, function(err) {
						if (err) console.log(err)
						else console.log('  zmq reply '+cc.addrReqRes);
					});

					// process.on('SIGINT', function() {
					//	impress.cloud.pub.close();
					//	impress.cloud.rep.close();
					// });

				} else if (cc.type == "server") {

					console.log('Connectiing to cloud controller...'.bold.green);

					// ZeroMQ subscriber socket
					//
					impress.cloud.sub = impress.zmq.socket('sub');
					impress.cloud.sub.on('message', function(reply) {
						//console.log("Received message: [", reply.toString(), "]");
						var msg = JSON.parse(reply.toString()),
							clusterId = 'C'+msg.node.between('C', 'N');
						if (clusterId !== impress.config.cluster.name) {
							//console.dir({mmm: msg});
							for (var id = 0; id < impress.workers.length; id++) {
								impress.workers[id].send(msg);
							}
						}
					});
					impress.cloud.sub.connect(cc.addrPubSub);
					impress.cloud.sub.subscribe("");
					console.log('  zmq subscriber '+cc.addrPubSub);

					// ZeroMQ request socket
					//
					impress.cloud.req = impress.zmq.socket('req');
					impress.cloud.req.on('message', function(reply) {
						// check is ok
					});
					impress.cloud.req.connect(cc.addrReqRes);
					console.log('  zmq request '+cc.addrReqRes);

					// impress.cloud.controller = {};
					// impress.cloud.controller.lastCheck = null;       // new Date().getTime();
					// impress.cloud.controller.lastCheckResult = null; // true, false, null
					//
					// Check connection to controller
					//
					// impress.cloud.controller.check = function() {
					// };
				}
			}
		}	
	}

} (global.impress = global.impress || {}));