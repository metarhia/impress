// URL rewriting and request forwarding rules

module.exports = [

/*
  {
    url:      '/api/(one|two)/(.*)',        // parse url using '()' as parameters, '|' as alternatives and '.*'
    rewrite:  '/example/[1].json?par1=[2]'  // rewrite url using [1]..[N] array (optional parameter)
  },
  {
    url:      '/api/(name1|name2|name3)/(.*)', // parse url using '()' as parameters, '|' as alternatives and '.*'
    rewrite:  '/api/[1]/[2]',                  // rewrite url using [1]..[N] array (optional parameter)
    host:     'example.com',                   // forward requests to specified host and port
    port:     80,
    slowTime: '1s'
  },
  {
    escaping: false,              // use full regexp syntax, no escaping for '?' and '.'
    url:      '^/(?!client)(.*)',
    rewrite:  '/client/[1]'
  }
*/

{
    url : "^/portfolio/(.+)/([0-9]{1,3})",
    rewrite:  "/detail/[1]/[2]",
    escaping: false
}
,

{
    url : "^/portfolio/([^/]+)",
    rewrite:  "/deseacelist/[1]",
    escaping: false
}

];
