module.exports = function(client, callback) {

  console.log('Page stored in cache for 30 sec, request.js and get.js will not be executed more often then 30 sec');
  callback();

}