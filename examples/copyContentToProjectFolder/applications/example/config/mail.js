// Mail configuration

module.exports = {
  enabled: false, // enable or disable smtp transport
  robot: 'Robot name <robotname@gmail.com>',
  options: {
      service: 'Gmail',
      auth: {
          user: 'username@gmail.com',
          pass: 'password'
      }
  }
};
