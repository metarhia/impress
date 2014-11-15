// Databases including persistent session storage and application specific

module.exports = {

  dbAlias: {
    url: 'mongodb://localhost:27017/impress',
    collections: [ 'sessions', 'users', 'groups', 'testCollection' ],
    slowTime: '2s',
    security: true,
  }

}
