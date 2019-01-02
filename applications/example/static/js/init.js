'use strict';

api.dom.on('load', () => {

  api.dom.addClass(document.body, 'js');

  const panelCenter = api.dom.id('panel-center');

  const auth = api.ajax({
    regValidation: { post: '/api/auth/regvalidation.json' },
    signUp: { post: '/api/auth/signUp.json' },
    signOut: { post: '/api/auth/signOut.json' },
  });

  // Auth Module

  api.dom.on('click', '#hmenu-Signin', () => {
    const closePopup = api.dom.popup('#formLogin');
    closePopup.closeElement = api.dom.element('#formLoginCancel');
    return false;
  });

  api.dom.on('click', '#hmenu-Signout', () => {
    auth.signOut({}, (/*err, data*/) => {
      if (localStorage) localStorage.clear();
      window.location.reload(true);
    });
    return false;
  });

  api.dom.on('click', '#hmenu-SignUp', () => {
    const closePopup = api.dom.popup('#formReg');
    closePopup.closeElement = api.dom.element('#formRegCancel');
    return false;
  });

  api.dom.on('click', '#formRegDo', (/*event*/) => {
    const inputEmail = api.dom.id('formRegEmail');
    const inputPassword = api.dom.id('formRegPassword');
    const data = { email: inputEmail.value };
    auth.regValidation(data, (err, json) => {
      console.dir(json);
      if (json) {
        data.password = inputPassword.value;
        console.dir(data);
        if (json.email) {
          api.dom.removeClass(inputEmail, 'invalid');
          auth.signUp(data, (err, data) => {
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

  api.dom.on('click', '#formLoginSignIn', () => {
    const btn = api.dom.id('formLoginSubmit');
    api.dom.fireEvent(btn, 'click');
  });

  // Left menu

  api.dom.on('click', '#menuAJAX', () => {
    const parameterName = 'paramaterValue';
    api.dom.load(
      '/examples/simple/ajaxTest.ajax?parameterName=' + parameterName,
      panelCenter
    );
  });

  api.dom.on('click', '#menuGetJSON', () => {
    const parameterName = 'paramaterValue';
    panelCenter.innerHTML = '<div class="progress"></div>';
    api.ajax.get(
      '/examples/simple/jsonGet.json',
      { parameterName },
      (err, res) => {
        panelCenter.innerHTML = '<pre>' +
          JSON.stringify(res, null, 2) + '</pre>';
      }
    );
  });

  api.dom.on('click', '#menuPostJSON', () => {
    const parameterName = 'paramaterValue';
    panelCenter.innerHTML = '<div class="progress"></div>';
    api.ajax.post(
      '/examples/simple/jsonPost.json',
      { parameterName },
      (err, res) => {
        panelCenter.innerHTML = '<pre>' +
          JSON.stringify(res, null, 2) + '</pre>';
      }
    );
  });

  api.dom.on('click', '#menuForkWorker', () => {
    api.ajax.get('/examples/tools/forkWorker.json', () => {
      panelCenter.innerHTML = 'Worker process forked, see console for output.';
    });
  });

  api.dom.on('click', '#menuLongWorker', () => {
    api.ajax.get('/examples/tools/longWorker.json', () => {
      panelCenter.innerHTML = 'Worker process forked and ' +
        'will terminate in 30 seconds, see console for output.';
    });
  });

  api.dom.on('click', '#menuTemplate', () => {
    window.location = '/examples/override';
  });

  api.dom.on('click', '#menuFileUpload', () => {
    api.dom.load('/examples/simple/upload.ajax', panelCenter);
  });

  api.dom.on('click', '#menuDownload', () => {
    panelCenter.innerHTML = '<iframe src="/examples/simple/download.ajax" ' +
      'style="display:none"></iframe>';
  });

  api.dom.on('click', '#menuGeoIP', () => {
    panelCenter.innerHTML = '<div class="progress"></div>';
    api.ajax.get('/examples/tools/geoip.json', (err, res) => {
      panelCenter.innerHTML = '<pre>' + JSON.stringify(res, null, 2) + '</pre>';
    });
  });

  let ws;
  api.dom.on('click', '#menuWS', () => {
    ws = api.ws('/examples/events/connect.ws');

    panelCenter.innerHTML = (
      '<a class="button silver" id="btnWsClose">' +
      '<span class="icon delete"></span>Close WebSocket connection</a> ' +
      '<a class="button silver" id="btnWsSend">' +
      '<span class="icon handshake"></span>Send "Hello" to WebSocket</a>' +
      '<hr>Connecting...<hr>'
    );
    const btnWsSend = api.dom.id('btnWsSend');

    ws.on('open', () => {
      panelCenter.insertAdjacentHTML('beforeend', 'Connection opened<hr>');
    });

    ws.on('close', () => {
      panelCenter.insertAdjacentHTML('beforeend', 'Connection closed<hr>');
    });

    ws.on('message', (event) => {
      panelCenter.insertAdjacentHTML(
        'beforeend', 'Message from server: ' + event.data + '<hr>'
      );
    });

    api.dom.on('click', '#btnWsClose', () => {
      ws.close();
      btnWsSend.style.display = 'none';
    });

    api.dom.on('click', '#btnWsSend', () => {
      panelCenter.insertAdjacentHTML(
        'beforeend', 'Sending to server: Hello<hr>'
      );
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
    const messageBlock = api.dom.id('jstpLog');

    function print(...args) {
      const msg = args.join(' ');
      if (messageBlock.innerText) {
        messageBlock.innerText += msg;
      } else {
        messageBlock.textContent += msg;
      }
      messageBlock.innerHTML += '<br>';
    }

    api.jstp.ws.connect('example',
      new api.jstp.Application('example', {}),
      'ws://localhost:8000',
      (error, connection, session) => {
        if (error) {
          print(error);
          return;
        }

        print('connection opened');
        print('handshake done, sid =', session);

        const button = api.dom.id('jstpDisconnect');
        button.onclick = function() {
          connection.disconnect();
          print('connection closed');
          button.innerHTML = 'Connect';
          button.onclick = runJstpExample;
        };

        connection.inspectInterface('interfaceName', runTests);
      }
    );

    function runTests(err, interfaceName) {
      if (err) {
        print(err);
        return;
      }

      interfaceName.on('eventName', (args) => {
        print('Got event, data:', JSON.stringify(args));
      });

      interfaceName.methodName(1, 2, 3, (err, res) => {
        if (err) {
          print(err);
          return;
        }
        print('result1 received');
        print(res);
      });

      interfaceName.sendEvent((err) => {
        if (err) {
          print(err);
          return;
        }
      });

      interfaceName.methodName(4, 5, 6, (err, res) => {
        if (err) {
          print(err);
          return;
        }
        print('result2 received');
        print(res);
        interfaceName.methodName(7, 8, 9, (err, res) => {
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

  api.dom.on('click', '#menuAuth', () => {
    window.location = '/examples/auth';
  });

});
