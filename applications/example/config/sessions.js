({
  // Sessions configuration

  anonymous: true, // Allow anonymous sessions
  cookie: 'SID', // Session cookie name
  characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  secret: 'secret', // Session secret
  length: 64, // SID length in bytes
  persist: true, // Store sessions in persistent database
  perIpLimit: 20,
  perUserLimit: 5,
  regenerate: Duration('30m'),
  expire: Duration('2h'),
  // domain: 'name.com' // domain for cookie
});
