{
  // Sessions configuration

  // Allow anonymous sessions
  anonymous: true,
  // (client should request /api/auth/anonymous to generate SID)

  // Session cookie name
  cookie: 'SID',

  // Possible characters for SID:
  characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',

  // Session secret
  // is a string known just at server side to sign session cookie
  secret: 'secret',

  // SID length in bytes
  length: 64,

  // Store sessions in persistent database
  persist: true,

  perIpLimit: '20',
  perUserLimit: '5',
  //confirmTime: '1m',
  //expireTime: '2m',

  // Optional domain for cookie '.domain.com' for all subdomains
  // domain: 'name.com'
}
