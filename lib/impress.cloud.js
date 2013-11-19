(function(impress) {

	impress.cloud = {};

	impress.cloud.nodeType = "standalone"; // standalone, controller, server, balancer, brocker
	impress.cloud.nodeStatus = "online";   // sleep, online, offline, updating, error, maintenance

	// Check connection to controller
	//
	impress.cloud.init = function() {
		if (impress.config.cloud) {
			var cc = impress.config.cloud;
			if (cc.nodeType == "controller") {
				if (impress.cluster.isMaster) console.log('Starting cloud controller...'.bold.green);
				//
				// Check cloud controller interface from "/sites" folder
				//
			} else if (cc.nodeType == "server") {
				if (impress.cluster.isMaster) console.log('Connectiing to cloud controller...'.bold.green);
				//
				// Connect to cloud controller
				//
				// cc.controller.protocol = http/https
				// cc.controller.host
				// cc.controller.port
				//
				impress.cloud.controller = {};
				impress.cloud.controller.lastCheck = null;       // new Date().getTime();
				impress.cloud.controller.lastCheckResult = null; // true, false, null
				//

				// Check connection to controller
				//
				impress.cloud.controller.check() = function() {
		
				};
			}
		}
	}

} (global.impress = global.impress || {}));