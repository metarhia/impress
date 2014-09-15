module.exports = function(client, callback) {

  api.dns.lookup('nodejs.org', 4, function(err, address, family) {
    if (api.geoip) {
      client.context.data = {
        req: {
          connection: {
            remoteAddress: client.req.connection.remoteAddress,
            geoip: api.geoip.lookup(client.req.connection.remoteAddress)
          }
        },
        example: {
          nodejs: {
            host: 'nodejs.org',
            geoip: api.geoip.lookup(address)
          }
        }
      }
    } else client.context.data = 'GeoIP plugin is not loaded';
    callback();
  });

}