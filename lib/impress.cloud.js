"use strict";

impress.cloud = {};

var zmq = impress.require('zmq');

if (zmq) {

  api.zmq = zmq;
  impress.cloud.type = 'standalone'; // standalone, controller, server, balancer, brocker
  impress.cloud.status = 'online';   // sleep, online, offline, updating, error, maintenance

  // Init connection to cloud controller
  //
  impress.cloud.init = function() {
    if (api.cluster.isMaster && impress.config.cloud) {
      var cc = impress.config.cloud;
      if (cc.type === 'controller') {

        console.log('Starting cloud controller...'.bold.green);

        // ZeroMQ publisher socket
        //
        impress.cloud.pub = zmq.socket('pub');
        impress.cloud.pub.bind(cc.addrPubSub, function(err) {
          if (err) console.log(err);
          else console.log('  zmq publisher '+cc.addrPubSub);
        });

        // ZeroMQ reply socket
        //
        impress.cloud.rep = zmq.socket('rep');
        impress.cloud.rep.on('message', function(request) {
          impress.cloud.rep.send('ok');
          impress.cloud.pub.send(request.toString());
        });
        impress.cloud.rep.bind(cc.addrReqRes, function(err) {
          if (err) console.log(err);
          else console.log('  zmq reply '+cc.addrReqRes);
        });

        // process.on('SIGINT', function() {
        //  impress.cloud.pub.close();
        //  impress.cloud.rep.close();
        // });

      } else if (cc.type === 'server') {

        console.log('Connecting to cloud controller...'.bold.green);

        // ZeroMQ subscriber socket
        //
        impress.cloud.sub = zmq.socket('sub');
        impress.cloud.sub.on('message', function(reply) {
          var msg = JSON.parse(reply.toString()),
              clusterId = 'C'+msg.node.between('C', 'N');
          if (clusterId !== impress.config.cluster.name) {
            for (var workerId in api.cluster.workers) {
              api.cluster.workers[workerId].send(msg);
            }
          }
        });
        impress.cloud.sub.connect(cc.addrPubSub);
        impress.cloud.sub.subscribe('');
        console.log('  zmq subscriber '+cc.addrPubSub);

        // ZeroMQ request socket
        //
        impress.cloud.req = zmq.socket('req');
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
  };

}
