global.onLoad(function() {

  $('body').addClass('js');
  $.fixCookie("SID");

  //global.disableContextMenu();
  //global.disableCopy();
  //global.disableSelection();

  panelLeft = $('#panel-left');
  panelCenter = $('#panel-center');
  panelRight = $('#panel-right');

  var auth = wcl.AjaxDataSource({
    regValidation:  { post: "/api/auth/regvalidation.json" },
    register:       { post: "/api/auth/register.json" },
    signOut:        { post: "/api/auth/signOut.json" },
  });

  // --- Auth Module ---

  $('#hmenu-Signin').click(function() {
    $('#formLogin').togglePopup();
    return false;
  });

  $('#hmenu-Signout').click(function() {
    auth.signOut({}, function(err, data) {
      if (localStorage) localStorage.clear();
      window.location.reload(true);
    });
    return false;
  });

  $('#hmenu-Register').click(function() {
    $('#formReg').togglePopup();
    return false;
  });

  $(document).on('click', '#formRegDo', function(event) {
    var inputEmail = $('#formRegEmail'),
      inputPassword = $('#formRegPassword'),
      RegValidation = null,
      Data = { "Email": inputEmail.val() };
    auth.regValidation(Data, function(err, json) {
      RegValidation = json;
      if (RegValidation!=null) {
        Data.Password = inputPassword.val();
        if (RegValidation.Email) {
          inputEmail.removeClass('invalid');
          auth.register(Data, function(err, data) { if (data.Result=='Ok') window.location.reload(true); });
        } else inputEmail.addClass('invalid').focus();
      }
    });
    return false;
  });

  $(document).on('click', '#formLoginSignIn', function() {
    $('#formLoginSubmit').click();
  });

  // --- LEFT MENU ---

  $(document).on('click', '#menuAJAX', function() {
    var parameterName = 'paramaterValue';
    panelCenter.load('/examples/simple/ajaxTest.ajax?parameterName='+parameterName);
  });

  $(document).on('click', '#menuGetJSON', function() {
    var parameterName = 'paramaterValue';
    panelCenter.empty().html('<div class="progress"></div>');
    $.get('/examples/simple/jsonGet.json?parameterName='+parameterName, function(res) {
      panelCenter.html('<pre>'+JSON.stringify(res, null, 2)+'</pre>');
    });
  });

  $(document).on('click', '#menuPostJSON', function() {
    var parameterName = 'paramaterValue';
    panelCenter.empty().html('<div class="progress"></div>');
    $.post('/examples/simple/jsonPost.json', { parameterName: parameterName }, function(res) {
      panelCenter.html('<pre>'+JSON.stringify(res, null, 2)+'</pre>');
    });
  });

  $(document).on('click', '#menuForkWorker', function() {
    $.get('/examples/tools/forkWorker.json', function(res) {
      panelCenter.html('Worker process forked, see console for output.');
    });
  });

  $(document).on('click', '#menuLongWorker', function() {
    $.get('/examples/tools/longWorker.json', function(res) {
      panelCenter.html('Worker process forked and will terminate in 30 seconds, see console for output.');
    });
  });

  $(document).on('click', '#menuTemplate', function() {
    window.location = '/examples/override';
  });

  $(document).on('click', '#menuDBMI', function() {
    window.location = '/dbmi';
  });

  $(document).on('click', '#menuSetup', function() {
    window.location = '/setup';
  });

  $(document).on('click', '#menuFileUpload', function() {
    panelCenter.load('/examples/simple/upload.ajax');
  });

  $(document).on('click', '#menuDownload', function() {
    panelCenter.html('<iframe src="/examples/simple/download.ajax" style="display:none"></iframe>');
  });

  $(document).on('click', '#menuGeoIP', function() {
    panelCenter.empty().html('<div class="progress"></div>');
    $.get('/examples/tools/geoip.json', function(res) {
      panelCenter.html('<pre>'+JSON.stringify(res, null, 2)+'</pre>');
    });
  });

  $(document).on('click', '#menuWS', function() {
    ws = new WebSocket("ws://127.0.0.1:80/examples/events/connect.ws");
    panelCenter.html(
      '<a class="button silver" id="btnWsClose"><span class="icon delete"></span>Close WebSocket connection</a> '+
      '<a class="button silver" id="btnWsSend"><span class="icon handshake"></span>Send "Hello" to WebSocket</a>'+
      '<hr>Connecting...<hr>'
    );

    ws.onopen = function() {
      panelCenter.append("Connection opened<hr>");
    }

    ws.onclose = function() {
      panelCenter.append("Connection closed<hr>");
    }

    ws.onmessage = function(evt) {
      panelCenter.append("Message from server: "+evt.data+"<hr>");
    }

    $('#btnWsClose').on('click', function() {
      ws.close();
      $('#btnWsClose').hide();
    });

    $('#btnWsSend').on('click', function() {
      panelCenter.append("Sending to server: Hello<hr>");
      ws.send("Hello");
    });
  });
  
  $(document).on('click', '#menuSSE', function() {
    panelCenter.html(
      '<a class="button silver" id="btnSseClose"><span class="icon delete"></span>Close connection</a> '+
      '<a class="button silver" id="btnSseSend"><span class="icon handshake"></span>Send event to server</a>'+
      '<hr>Connecting...<hr>'
    );
    sseConnect();
  });

  function sseConnect() {
    var sse = new EventSource("/examples/events/connect.sse");

    sse.addEventListener("TestEvent", function(e) {
      panelCenter.append("Event: "+e.type+"; Data: "+e.data+"<hr>");
    });

    sse.addEventListener("open", function(e) {
      panelCenter.append("Connection opened<hr>");
    }, false);

    sse.addEventListener("error", function(e) {
      if (e.readyState == EventSource.CLOSED) panelCenter.append("Connection closed by server<hr>");
      else panelCenter.append("SSE Error: readyState="+sse.readyState+"<hr>");
    }, false);

    $('#btnSseClose').on('click', function() {
      sse.close();
      panelCenter.append("Connection closed by user<hr>");
      $('#btnSseClose').hide();
    });

    $('#btnSseSend').on('click', function() {
      panelCenter.append("Sending event to server, it should return back.<hr>");
      $.get('/examples/events/sendEvent.json', function(res) {
      });
    });
  }

  $(document).on('click', '#menuSendMail', function() {
  });

  $(document).on('click', '#menuHealth', function() {
    panelCenter.html('<div id="chartHealth"></div>');

    //var n = 40,
    //  random = d3.random.normal(0, .2),
    //  data = d3.range(n).map(random);

    var n = 40;

    for (var i = 0, data = new Array(n); i < n;) data[i++] = 0;

    var margin = {top: 20, right: 20, bottom: 20, left: 40},
      width = 960 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

    var x = d3.scale.linear().domain([0, n - 1]).range([0, width]);

    var y = d3.scale.linear().domain([0, 1]).range([height, 0]);

    var line = d3.svg.line()
      .x(function(d, i) { return x(i); })
      .y(function(d, i) { return y(d); });

    var svg = d3.select("#chartHealth")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("defs")
      .append("clipPath")
        .attr("id", "clip")
      .append("rect")
        .attr("width", width)
        .attr("height", height);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + y(0) + ")")
      .call(d3.svg.axis().scale(x).orient("bottom"));

    svg.append("g")
      .attr("class", "y axis")
      .call(d3.svg.axis().scale(y).orient("left"));

    var path = svg
      .append("g")
        .attr("clip-path", "url(#clip)")
      .append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);

    tick();

    function bytesToSize(bytes) {
      if (bytes == 0) return 0;
      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i), 2) / 1024;
    }

    function tick() {
      $.get('/examples/tools/serverHealth.json', function(res) {
        data.push(bytesToSize(res.memory.heapUsed));
        console.log(res.memory.heapUsed+'   '+bytesToSize(res.memory.heapUsed));

        path
          .attr("d", line)
          .attr("transform", null)
        .transition()
          .duration(1000)
          .ease("linear")
          .attr("transform", "translate(" + x(-1) + ",0)")
          .each("end", tick);
        data.shift();
      });
    }

  });

  $(document).on('click', '#btnApplySetup', function() {
    var npmModules = $('#npmModules input'),
      npmChecked = [];
    npmModules.each(function() {
      if ($(this)[0].checked) npmChecked.push($(this).val());
    });
    $.post('/setup/apply.json', { npmChecked: npmChecked.join(',') }, function(res) {
      panelCenter.html('<pre>Module(s) installing... See console output.</pre>');
    });
  });

  $(document).on('click', '#menuAuth', function() {
    window.location = '/examples/auth';
  });

});

$.ajaxSetup({cache: false});

jQuery.fn.enable = function(flag) {
  if (flag) this.removeClass('disabled'); else this.addClass('disabled');
}

jQuery.fn.visible = function(flag) {
  if (flag) this.show(); else this.hide();
}

jQuery.fn.reload = function(url, callback) {
  var panel = this;
  panel.scroller('remove').empty().html('<div class="progress"></div>').load(url, function() {
    //panel.removeAttr('style').scroller('y');
    panel.scroller('y');
    if (global.platform.iOS) panel.width(panel.width()-1);
    $('a.default', panel).click();
    if (callback) callback.call(panel);
    //$('textarea').autoResize({ animateDuration: 300, extraSpace: 20 }).trigger('change');
    //refreshControls();
  });
}

$.fn.alignCenter = function() {
  var marginLeft = Math.max(40, parseInt($(window).width()/2 - $(this).width()/2)) + 'px';
  var marginTop = Math.max(40, parseInt($(window).height()/2 - $(this).height()/2)) + 'px';
  return $(this).css({'margin-left':marginLeft, 'margin-top':marginTop});
}

$.fn.togglePopup = function() {
  if ($('#popup').hasClass('hidden')) {
    if (global.platform.IE) {
      $('#darken').height($(document).height()).toggleClass('hidden');
    } else {
      $('#darken').height($(document).height()).toggleClass('hidden').fadeTo('slow', 0.5).click(function(event) {
        event.stopPropagation();
        var form = $('#popup .form');
        if ($(form).length) $(form).togglePopup();
      });
    }
    $(this).appendTo('#popup');
    $('#popup').alignCenter().toggleClass('hidden');
    $('form :input:visible:enabled:first',this).focus();
  } else {
    $('#darken').toggleClass('hidden').removeAttr('style');
    $('#popup').toggleClass('hidden').removeAttr('style');
    $('#popup .form').appendTo('#forms');
  }
}

function closeForm() {
  Form = $('#popup .form');
  var $inputs = $('form select:input',Form);
  $inputs.each(function() {
    //alert($(this).val());
    $(this).combobox('destroy');
  });
  if (Form.length) $(Form).togglePopup();
}

$(document).keydown(function(event) {
  if      (event.keyCode == 27) closeForm();
  else if (event.keyCode == 13) $('#popup .form .save').trigger('click');
});

$(document).on('click', '#popup .cancel', function(event) {
  closeForm();
  return false;
});

// --- Confirmation ---

// Buttons: ['Yes','No','Ok','Cancel']
function confirmation(Title,Message,eventYes,Buttons) {
  var form = $('#formConfirmation');
  if (typeof(Buttons)=='undefined') Buttons = ['Cancel','Yes'];
  $('.header',form).html(Title);
  $('.message',form).html('<br/>'+Message+'<br/><br/>');
  formConfirmationYes = eventYes;
  $('#formConfirmationYes').visible($.inArray('Yes', Buttons)>-1);
  $('#formConfirmationOk').visible($.inArray('Ok', Buttons)>-1);
  $('#formConfirmationNo').visible($.inArray('No', Buttons)>-1);
  $('#formConfirmationCancel').visible($.inArray('Cancel', Buttons)>-1);
  form.togglePopup();
}

$(document).on('click','#formConfirmation .button.save',function(event) {
  if (typeof(formConfirmationYes)=='function') formConfirmationYes();
  formConfirmationYes = null;
  closeForm();
  return false;
});

// --- Input ---

function input(Title,Prompt,DefaultValue,eventOk) {
  var form = $('#formInput');
  $('.header',form).html(Title);
  //$('.message',form).html(Message);
  $('.field .label',form).html(Prompt);
  //if (DefaultValue)
  $('#formInputValue').val(DefaultValue);
  formInputOk = eventOk;
  form.togglePopup();
}

$(document).on('click','#formInputOk',function(event) {
  if (formInputOk) formInputOk($('#formInputValue').val());
  formInputOk = null;
  closeForm();
  return false;
});