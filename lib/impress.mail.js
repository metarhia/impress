"use strict";

var nodemailer = impress.require('nodemailer');

if (nodemailer) {

  api.nodemailer = nodemailer;

  // Initialize SMTP transport
  if (impress.config.mail) {
    impress.mail = nodemailer.createTransport(
      'SMTP',
      impress.config.mail.options
    );
  }

  impress.sendPassword = function(to) {
    if (impress.mail) impress.mail.sendMail({
      from: impress.config.mail.robot,
      to: to,
      subject: 'Hello',
      text: 'Hello world !',
      html: '<b>Hello world !</b>'
    }, function(error, response) {
      if (error) {
        console.log(error);
      } else {
        console.log('Message sent: ' + response.message);
      }
    });
  };

}
