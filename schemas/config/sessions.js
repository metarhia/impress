({
  sid: { type: 'string', default: 'token' },
  characters: {
    type: 'string',
    default: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  },
  length: { type: 'number', default: 64 },
  secret: 'string',
  regenerate: { type: 'number', default: 60 * 60 * 1000 },
  expire: { type: 'number', default: 24 * 60 * 60 * 1000 },
  persistent: { type: 'boolean', default: true },
  limits: {
    ip: { type: 'number', default: 20 },
    user: { type: 'number', default: 5 },
  },
});
