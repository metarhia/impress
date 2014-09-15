// Cloud and health configuration

module.exports = {
  name:       'PrivateCloud', // cloud name
  type:       'standalone',   // cloud instance type: standalone, controller, server
  controller: '127.0.0.1',    // cloud controller IP address
  pubSubPort: '3000',         // bublisher/subscriber port
  reqResPort: '3001',         // request/reply port
  health:     '2s'            // health monitoring interval
};
