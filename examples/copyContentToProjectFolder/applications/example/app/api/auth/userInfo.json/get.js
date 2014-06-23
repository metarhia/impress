module.exports = function(client, callback) {

    client.context.data = client.req.user ? client.req.user : {};
    callback();

};
