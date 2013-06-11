global.onLoad(function() {

	$('body').addClass('js');
	$.fixCookie("SID");

	global.disableContextMenu();
	global.disableCopy();
	global.disableSelection();

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

});

$.ajaxSetup({cache: false});

jQuery.fn.enable = function(flag) {
	if (flag) this.removeClass('disabled'); else this.addClass('disabled');
}

jQuery.fn.visible = function(flag) {
	if (flag) this.show(); else this.hide();
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
