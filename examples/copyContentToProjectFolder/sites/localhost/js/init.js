global.onLoad(function() {

	$('body').addClass('js');
	$.fixCookie("SID");

	//global.disableContextMenu();
	//global.disableCopy();
	//global.disableSelection();

	panelLeft = $('#panel-left');
	panelCenter = $('#panel-center');
	panelRight = $('#panel-right');

	// -------------------

	//setTimeout(sseConnect, 1000);

	function sseConnect() {
		var sse = new EventSource("/api/examples/test.sse");
		var sseListener = function(event) {
			var div = document.createElement("div");
			var type = event.type;
			div.appendChild(document.createTextNode(type + ": " + (type === "message" ? event.data : sse.url)));
			id("panel-center").appendChild(div);
		};
		sse.addEventListener("open", function(e) {
			console.log("open: sse.readyState="+sse.readyState);
		}, false);
		sse.addEventListener("ping", function(e) {
			console.log("ping: type="+e.type+", data="+e.data);
		}, false);
		sse.addEventListener("error", function(e) {
			//setTimeout(sseConnect, 3000);
			console.log("error: sse.readyState="+sse.readyState);
		}, false);
	}

	// --- Auth Module ---

	$('#hmenu-Signin').click(function() {
		$('#formLogin').togglePopup();
		return false;
	});

	$('#hmenu-Signout').click(function() {
		$.post('/api/auth/signOut.json', {}, function(data) {
			if (localStorage) localStorage.clear();
			window.location.reload(true);
		}, "json");
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
		$.ajax({
			url: '/api/auth/regvalidation.json',
			type: 'POST',
			dataType: 'json',
			async: false,
			data: Data,
			success: function(json) { RegValidation = json; }
		});
		if (RegValidation!=null) {
			Data.Password = inputPassword.val();
			if (!RegValidation.Email) inputEmail.addClass('invalid').focus(); else inputEmail.removeClass('invalid');
			$.post("/api/auth/register.json", Data, function(data) {
				if (data.Result=='Ok') window.location.reload(true);
			}, "json");
		}
		return false;
	});

	$(document).on('click', '#formLoginSignIn', function() {
		$('#formLoginSubmit').click();
	});

	// --- LEFT MENU ---

	$(document).on('click', '#menuAJAX', function() {
		var parameterName = 'paramaterValue';
		panelCenter.load('/examples/ajaxTest.ajax?parameterName='+parameterName);
	});

	$(document).on('click', '#menuGetJSON', function() {
		var parameterName = 'paramaterValue';
		panelCenter.empty().html('<div class="progress"></div>');
		$.get('/examples/jsonGet.json?parameterName='+parameterName, function(res) {
			panelCenter.html('<pre>'+JSON.stringify(res, null, 2)+'</pre>');
		});
	});

	$(document).on('click', '#menuPostJSON', function() {
		var parameterName = 'paramaterValue';
		panelCenter.empty().html('<div class="progress"></div>');
		$.post('/examples/jsonPost.json', { parameterName: parameterName }, function(res) {
			panelCenter.html('<pre>'+JSON.stringify(res, null, 2)+'</pre>');
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
		panelCenter.load('/examples/upload.ajax');
	});

	$(document).on('click', '#menuDownload', function() {
		panelCenter.html('<iframe src="/examples/download.ajax" style="display:none"></iframe>');
	});

	$(document).on('click', '#menuGeoIP', function() {
		panelCenter.empty().html('<div class="progress"></div>');
		$.get('/examples/geoip.json', function(res) {
			panelCenter.html('<pre>'+JSON.stringify(res, null, 2)+'</pre>');
		});
	});

	$(document).on('click', '#menuSSE', function() {
	});

	$(document).on('click', '#menuWS', function() {
		ws = new WebSocket("ws://127.0.0.1:80/examples/connect.ws");
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

	$(document).on('click', '#menuSendMail', function() {
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