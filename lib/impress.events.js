'use strict';

impress.events = {};

// Events pligin definition
//
impress.events.mixinApplication = function(application) {

  application.events = {
    channels: {},   // event channels indexed by channel name, channel is an array of logins
    statistics: {
      personal: 0,  // sent using .sendToUser
      channel:  0,  // sent using .sendToChannel
      global:   0   // sent using .sendGlobal
    }
  };

  // Send event to all connections of given user
  //
  application.events.sendToUser = function(login, eventName, data, isTarget) {
    if (impress.cloud.role === 'client' && !isTarget) impress.cloud.event(application.name, eventName, data); // target: user, to: login
    if (application.sse) application.sse.sendToUser(login, eventName, data);
  };

  // Send event to all users in channel
  //
  application.events.sendToChannel = function(channel, eventName, data, isTarget) {
    if (impress.cloud.role === 'client' && !isTarget) impress.cloud.event(application.name, eventName, data); // target: channel, to: channel
    if (application.sse) application.sse.sendToChannel(channel, eventName, data);
  };

  // Send event to all users in system
  //
  application.events.sendGlobal = function(eventName, data, isTarget) {    
    //console.log('application.events.sendGlobal in '+impress.nodeId+' isTarget='+isTarget);
    if (!isTarget) impress.cloud.event(application.name, eventName, data); // target: global
    if (application.sse) application.sse.sendGlobal(eventName, data);
    if (isTarget) application.emit(eventName, data);
  };

};
