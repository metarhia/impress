'use strict';

// Preparing stack trace optimization

const STACK_REGEXP = [
  [process.dir + impress.PATH_SEPARATOR + 'node_modules', ''],
  [process.dir + impress.PATH_SEPARATOR + 'lib', ''],
  [process.dir, ''],
  [/\n\s{4,}at/g, ';'],
  [/\n/g, ';'],
  [/[\t^]/g, ' '],
  [/\s{2,}/g, ' '],
  [/;\s;/g, ';']
].map(({ rx, to }) => {
  if (typeof(rx) === 'string') {
    rx = api.common.newEscapedRegExp(rx);
  }
  return [rx, to];
});

impress.normalizeStack = (stack) => {
  STACK_REGEXP.forEach(({ rx, to }) => {
    stack = stack.replace(rx, to);
  });
  return stack;
};

impress.findApplicationByStack = (err) => {
  let appName, path;
  for (appName in impress.applications) {
    path = '/applications/' + appName;
    if (err.stack.includes(path)) return appName;
  }
};
