[
  // URL rewriting and request forwarding rules

  /*
  {
    // parse url using '()' as parameters, '|' as alternatives and '.*'
    url: '/api/(one|two)/(.*)',

    // rewrite url using [1]..[N] array (optional parameter)
    rewrite: '/example/[1].json?par1=[2]'
  },
  {
    // parse url using '()' as parameters, '|' as alternatives and '.*'
    url: '/api/(name1|name2|name3)/(.*)',

    // rewrite url using [1]..[N] array (optional parameter)
    rewrite: '/api/[1]/[2]',

    // forward requests to specified host and port
    host: 'example.com',

    port: 80,
    slowTime: '1s'
  },
  {
    // use full regexp syntax, no escaping for '?' and '.'
    escaping: false,
    url: '^/(?!client)(.*)',
    rewrite: '/client/[1]'
  }
  */

  {
    url: '^/portfolio/(.+)/([0-9]{1,3})',
    rewrite:  '/detail/[1]/[2]',
    escaping: false
  },
  {
    url: '^/portfolio/([^/]+)',
    rewrite:  '/deseacelist/[1]',
    escaping: false
  }

]
