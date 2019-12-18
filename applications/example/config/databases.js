({
  // Databases including persistent session storage and application specific

  gs: {
    alias: 'gs',
    url: 'gs://metarhia.com/',
    security: false,

    user: 'postgres',
    password: '',
    host: 'localhost',
    database: 'metarhia',
    port: 5432,
  },

  // PgSQL example database configuration
  //
  //  pgsqlConnection: {
  //    // Connection string (required)
  //    url: 'postgres://impress:password@127.0.0.1/test',
  //    // Time to log query as slow
  //    // (optional, default: '2s', in milliseconds or string like '5s')
  //    slowTime: 1000
  //  },

});
