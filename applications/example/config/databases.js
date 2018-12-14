{
  // Databases including persistent session storage and application specific

  // dbName: {
  //   alias: 'dbAlias', // optional alias to access database from global context
  //   url: 'mongodb://127.0.0.1:27017/impress', // connection string
  //   collections: ['sessions', 'users', 'groups', 'testCollection'], // optional
  //   slowTime: Duration('2s') // timeout to mark requests as "slow"
  // },

  gs: {
    alias: 'gs',
    url: 'gs://metarhia.com/',
    security: true,

    user: 'postgres',
    password: '',
    host: 'localhost',
    database: 'metarhia',
    port: 5432,
  },

  // MySQL example database configuration
  //
  //  mysqlConnection: {
  //    // Connection string (required)
  //    url: 'mysql://impress:password@127.0.0.1/impress',
  //    // Time to log query as slow
  //    // (optional, default: '2s', in milliseconds or string like '5s')
  //    slowTime: 1000
  //  },

  // PgSQL example database configuration
  //
  //  pgsqlConnection: {
  //    // Connection string (required)
  //    url: 'postgres://impress:password@127.0.0.1/test',
  //    // Time to log query as slow
  //    // (optional, default: '2s', in milliseconds or string like '5s')
  //    slowTime: 1000
  //  },

  // Oracle example database configuration
  //
  // oracleConnection: {
  //   url: 'oracle://user:password@host:port/database',
  //   slowTime: 1000,
  //   poolMax: 10
  // },

  // MongoDB example database configuration
  //
  //  mongoConnection: {
  //    // Connection string (required)
  //    url: 'mongodb://127.0.0.1:27017/dbname',
  //    // Collection to be created automatically if not exists
  //    collections: ['collname1', 'collname2'],
  //    // Time to log query as slow
  //    // (optional, default: '2s', in milliseconds or string like '5s')
  //    slowTime: Duration('2s')
  //  }

}
