'use strict';

api.dom.on('load', function() {

  api.dom.addClass(document.body, 'js');
  api.dom.fixCookie('SID');

  var panelCenter = api.dom.id('panel-center');

  var auth = api.ajax({
    regValidation: { post: '/api/auth/regvalidation.json' },
    signUp: { post: '/api/auth/signUp.json' },
    signOut: { post: '/api/auth/signOut.json' }
  });

  // Auth Module

  api.dom.on('click', '#hmenu-Signin', function() {
    var closePopup = api.dom.popup('#formLogin');
    closePopup.closeElement = api.dom.element('#formLoginCancel');
    return false;
  });

  api.dom.on('click', '#hmenu-Signout', function() {
    auth.signOut({}, function(/*err, data*/) {
      if (localStorage) localStorage.clear();
      window.location.reload(true);
    });
    return false;
  });

  api.dom.on('click', '#hmenu-SignUp', function() {
    var closePopup = api.dom.popup('#formReg');
    closePopup.closeElement = api.dom.element('#formRegCancel');
    return false;
  });

  api.dom.on('click', '#formRegDo', function(/*event*/) {
    var inputEmail = api.dom.id('formRegEmail'),
        inputPassword = api.dom.id('formRegPassword'),
        data = { email: inputEmail.value };
    auth.regValidation(data, function(err, json) {
      console.dir(json);
      if (json) {
        data.password = inputPassword.value;
        console.dir(data);
        if (json.email) {
          api.dom.removeClass(inputEmail, 'invalid');
          auth.signUp(data, function(err, data) {
            if (data.result === 'ok') window.location.reload(true);
          });
        } else {
          api.dom.addClass(inputEmail, 'invalid');
          inputEmail.focus();
        }
      }
    });
    return false;
  });

  api.dom.on('click', '#formLoginSignIn', function() {
    var btn = api.dom.id('formLoginSubmit');
    api.dom.fireEvent(btn, 'click');
  });

  // Left menu

  api.dom.on('click', '#menuAJAX', function() {
    var parameterName = 'paramaterValue';
    api.dom.load('/examples/simple/ajaxTest.ajax?parameterName=' + parameterName, panelCenter);
  });

  api.dom.on('click', '#menuGetJSON', function() {
    var parameterName = 'paramaterValue';
    panelCenter.innerHTML ='<div class="progress"></div>';
    api.ajax.get('/examples/simple/jsonGet.json', { parameterName: parameterName }, function(err, res) {
      panelCenter.innerHTML = '<pre>' + JSON.stringify(res, null, 2) + '</pre>';
    });
  });

  api.dom.on('click', '#menuPostJSON', function() {
    var parameterName = 'paramaterValue';
    panelCenter.innerHTML = '<div class="progress"></div>';
    api.ajax.post('/examples/simple/jsonPost.json', { parameterName: parameterName }, function(err, res) {
      panelCenter.innerHTML = '<pre>' + JSON.stringify(res, null, 2) + '</pre>';
    });
  });

  api.dom.on('click', '#menuForkWorker', function() {
    api.ajax.get('/examples/tools/forkWorker.json', function() {
      panelCenter.innerHTML = 'Worker process forked, see console for output.';
    });
  });

  api.dom.on('click', '#menuLongWorker', function() {
    api.ajax.get('/examples/tools/longWorker.json', function() {
      panelCenter.innerHTML = 'Worker process forked and will terminate in 30 seconds, see console for output.';
    });
  });

  api.dom.on('click', '#menuTemplate', function() {
    window.location = '/examples/override';
  });

  api.dom.on('click', '#menuFileUpload', function() {
    api.dom.load('/examples/simple/upload.ajax', panelCenter);
  });

  api.dom.on('click', '#menuDownload', function() {
    panelCenter.innerHTML = '<iframe src="/examples/simple/download.ajax" style="display:none"></iframe>';
  });

  api.dom.on('click', '#menuGeoIP', function() {
    panelCenter.innerHTML = '<div class="progress"></div>';
    api.ajax.get('/examples/tools/geoip.json', function(err, res) {
      panelCenter.innerHTML = '<pre>' + JSON.stringify(res, null, 2) + '</pre>';
    });
  });

  var ws;
  api.dom.on('click', '#menuWS', function() {
    ws = api.ws('/examples/events/connect.ws');

    panelCenter.innerHTML = (
      '<a class="button silver" id="btnWsClose"><span class="icon delete"></span>Close WebSocket connection</a> ' +
      '<a class="button silver" id="btnWsSend"><span class="icon handshake"></span>Send "Hello" to WebSocket</a>' +
      '<hr>Connecting...<hr>'
    );
    var btnWsSend = api.dom.id('btnWsSend');

    ws.on('open', function() {
      panelCenter.insertAdjacentHTML('beforeend', 'Connection opened<hr>');
    });

    ws.on('close', function() {
      panelCenter.insertAdjacentHTML('beforeend', 'Connection closed<hr>');
    });

    ws.on('message', function(event) {
      panelCenter.insertAdjacentHTML('beforeend', 'Message from server: ' + event.data + '<hr>');
    });

    api.dom.on('click', '#btnWsClose', function() {
      ws.close();
      btnWsSend.style.display = 'none';
    });

    api.dom.on('click', '#btnWsSend', function() {
      panelCenter.insertAdjacentHTML('beforeend', 'Sending to server: Hello<hr>');
      ws.send('Hello');
    });
  });

  api.dom.on('click', '#menuJSTP', runJstpExample);

  function runJstpExample() {
    panelCenter.innerHTML = (
      '<div id="jstpLog"></div>' +
      '<button id="jstpDisconnect">Disconnect</button>'
    );
    jstpConnect();
  }

  function jstpConnect() {
    var messageBlock = api.dom.id('jstpLog');

    function print() {
      var msg = Array.prototype.join.call(arguments, ' ');
      if (messageBlock.innerText) {
        messageBlock.innerText += msg;
      } else {
        messageBlock.textContent += msg;
      }
      messageBlock.innerHTML += '<br>';
    }

    var client = api.jstp.ws.createClient('ws://localhost:8000',
      new api.jstp.Application('example', {}));

    client.connect(function(error, connection) {
      if (error) {
        print(error);
        return;
      }

      print('connection opened');

      var button = api.dom.id('jstpDisconnect');
      button.onclick = function() {
        client.disconnect();
        print('connection closed');
        button.innerHTML = 'Connect';
        button.onclick = runJstpExample;
      };

      connection.handshake('example', null, null, function(err, session) {
        if (err) {
          print(err);
          return;
        }
        print('handshake done, sid =', session);
        connection.inspectInterface('interfaceName', runTests);
      });
    });

    function runTests(err, interfaceName) {
      if (err) {
        print(err);
        return;
      }

      interfaceName.on('eventName', function(args) {
        print('Got event, data:', api.jstp.stringify(args));
      });

      interfaceName.methodName(1, 2, 3, function(err, res) {
        if (err) {
          print(err);
          return;
        }
        print('result1 received');
        print(res);
      });

      interfaceName.sendEvent(function(err) {
        if (err) {
          print(err);
          return;
        }
      });

      interfaceName.methodName(4, 5, 6, function(err, res) {
        if (err) {
          print(err);
          return;
        }
        print('result2 received');
        print(res);
        interfaceName.methodName(7, 8, 9, function(err, res) {
          if (err) {
            print(err);
            return;
          }
          print('result3 received');
          print(res);
        });
      });
    }
  }

  api.dom.on('click', '#menuSSE', function() {
    panelCenter.innerHTML = (
      '<a class="button silver" id="btnSseClose"><span class="icon delete"></span>Close connection</a> ' +
      '<a class="button silver" id="btnSseSend"><span class="icon handshake"></span>Send event to server</a>' +
      '<hr>Connecting...<hr>'
    );
    sseConnect();
  });

  function sseConnect() {
    var sse = api.sse('/examples/events/connect.sse');
    var btnSseClose = api.dom.id('btnSseClose');

    sse.on('test', function(event) {
      panelCenter.insertAdjacentHTML('beforeend', 'Event: ' + event.type + '; Data: ' + event.data + '<hr>');
    });

    sse.on('open', function() {
      panelCenter.insertAdjacentHTML('beforeend', 'Connection opened<hr>');
    });

    sse.on('error', function(event) {
      if (event.readyState === EventSource.CLOSED) {
        panelCenter.insertAdjacentHTML('beforeend', 'Connection closed by server<hr>');
      } else {
        panelCenter.insertAdjacentHTML('beforeend', 'SSE Error: readyState=' + sse.readyState + '<hr>');
      }
    });

    api.dom.on('click', '#btnSseClose', function() {
      sse.close();
      panelCenter.insertAdjacentHTML('beforeend', 'Connection closed by user<hr>');
      btnSseClose.style.display = 'none';
    });

    api.dom.on('click', '#btnSseSend', function() {
      panelCenter.insertAdjacentHTML('beforeend', 'Sending event to server, it should return back.<hr>');
      api.ajax.get('/examples/events/sendEvent.json');
    });
  }

  api.dom.on('click', '#menuChat', function() {
    panelCenter.innerHTML = (
      '<div id="chatPanel" style="position:relative; height:100%;">' +
        '<div id="chatMessages" style="position:absolute; top:0; bottom:50px; left:0; right:0; overflow-y: scroll; overflow-x: hidden;"></div>' +
        '<div style="position:absolute; bottom:0; left:0; right:0">' +
          '<div style="float:left; width:100px"><input type="text" value="Anonymous" name="chatUserName" class="edit" id="chatUserName" style="width:80px" /></div>' +
          '<div style="float:right; width:130px"><a class="button silver" id="btnChatSend"><span class="icon handshake"></span>Send message</a></div>' +
          '<div style="position:absolute; left:100px; right:150px"><input type="text" value="" name="chatMessage" class="edit" id="chatMessage" style="width:100%" /></div>' +
        '</div>' +
      '</div>'
    );
    chatConnect();
  });

  function chatConnect() {
    var chat = api.sse('/examples/chat/connect.sse'),
        chatMessages = api.dom.id('chatMessages'),
        chatMessage = api.dom.id('chatMessage'),
        chatUserName = api.dom.id('chatUserName');

    chatMessage.focus();

    function msg(s) {
      chatMessages.insertAdjacentHTML('beforeend', '<div>' + s + '<hr></div>');
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chat.addEventListener('chat', function(event) {
      var data = JSON.parse(event.data);
      msg(data.name + '(' + data.ip + '): ' + data.message);
    });

    chat.addEventListener('open', function() {
      msg('Connected to chat server');
    });

    chat.addEventListener('error', function(event) {
      if (event.readyState === EventSource.CLOSED) msg('Connection closed by server');
      else msg('Error: readyState=' + chat.readyState);
    });

    api.dom.on('click', '#btnChatSend', function() {
      api.ajax.post(
        '/examples/chat/sendMessage.json',
        { name: chatUserName.value, message: chatMessage.value },
        function(/*err, res*/) { }
      );
    });
  }

  api.dom.on('click', '#menuAuth', function() {
    window.location = '/examples/auth';
  });

});
