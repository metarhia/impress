'use strict';

// Preparing stack trace optimization

impress.shortenStack = (stack) => {
  if (!stack) return '';
  const path = process.dir + impress.PATH_SEPARATOR;
  const result = stack
    .replace(api.common.newEscapedRegExp(path + 'node_modules'), '')
    .replace(api.common.newEscapedRegExp(path + 'lib/'), '')
    .replace(api.common.newEscapedRegExp(process.dir), '');
  return result;
};

impress.findApplicationByStack = (err) => {
  for (const appName in impress.applications) {
    const path = '/applications/' + appName;
    if (err.stack.includes(path)) return appName;
  }
  return 'impress';
};
