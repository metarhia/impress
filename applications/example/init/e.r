// Catch event by name

application.on('started', () => {

application.backend.on('test', function(data) {
  console.log('Event "test" received by: ' + application.nodeId);
  console.log('  data: ' + api.json.stringify(data));
});

api.timers.setInterval(function() {
  console.log('Event "test" sent by: ' + application.nodeId);
  application.backend.emit('test', { sender: application.nodeId, data: 'data' });
}, 5000);

});
