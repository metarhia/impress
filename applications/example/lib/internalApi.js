// Example: application internal API (accessible from any place on application)

api.news = {};

api.news.data = [
  {
    title: 'Version 0.1.1 released',
    date: '2015-01-01',
    author: 'Marcus Aurelius',
    changes: [
      'Fixed MongoDB schema validation',
      'Fixed double context initialization',
      'Moved merge and inArray from global context to api.impress namespace'
    ]
  },
  {
    title: 'Version 0.1.2 released',
    date: '2015-01-02',
    author: 'Marcus Aurelius',
    changes: [
      'Fixed ReferenceError: login is not defined',
      'Fixed name collision dispatch/dispatcher',
      'Minor code refactoring'
    ]
  },
  {
    title: 'Version 0.1.3 released',
    date: '2015-01-05',
    author: 'Marcus Aurelius',
    changes: [
      'Decomposed application.dispatcher to application.dispatchRoute',
      'Optimized receiving large requests in chunks'
    ]
  },
  {
    title: 'Version 0.1.4 released',
    date: '2015-01-08',
    author: 'Marcus Aurelius',
    changes: [
      'Decomposed method dispatcher into: impress.dispatcher',
      'Avoid inheritance for classes User and Session'
    ]
  }
];

api.news.current = -1;

api.news.listTitles = () => api.news.data.map(item => item.title);

api.news.getNext = () => {
  api.news.current++;
  if (api.news.current >= api.news.data.length) {
    api.news.current = 0;
  }
  return api.news.data[api.news.current];
};

api.news.shuffle = () => api.common.shuffle(api.news.data);

api.news.getItem = (n) => api.news.data[n];
