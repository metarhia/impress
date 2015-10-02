// Example: application internal API (accessible from any place on application)

api.news = {};

api.news.data = [
  { title: 'Version 0.1.195 released', date: '2015-01-11', author: 'Marcus Aurelius', changes: [
    'Fixed MongoDB schema validation',
    'Fixed double context initialization using application.callInContext(impress.initContext);',
    'Moved merge and inArray from global context to api.impress namespace, issue #189'
  ] },
  { title: 'Version 0.1.194 released', date: '2015-01-10', author: 'Marcus Aurelius', changes: [
    'Fixed ReferenceError: login is not defined, issue #194',
    'Fixed name collision dispatch/dispatcher',
    'Minor code refactoring'
  ] },
  { title: 'Version 0.1.193 released', date: '2015-01-09', author: 'Marcus Aurelius', changes: [
    'Decomposed application.dispatcher to application.dispatchRoute',
    'Optimized receiving large requests in chunks'
  ] },
  { title: 'Version 0.1.192 released', date: '2015-01-08', author: 'Marcus Aurelius', changes: [
    'Decomposed method dispatcher into: impress.dispatcher and application.dispatcher',
    'Avoid inheritance for classes User and Session, issue #193'
  ] },
];

api.news.current = -1;

api.news.listTitles = function() {
  return api.news.data.map(function(item) {
    return item.title;
  });
};

api.news.getNext = function() {
  api.news.current++;
  if (api.news.current >= api.news.data.length) api.news.current = 0;
  return api.news.data[api.news.current];
};

api.news.shuffle = function() {
  api.impress.shuffle(api.news.data);
};

api.news.getItem = function(n) {
  return api.news.data[n];
};
