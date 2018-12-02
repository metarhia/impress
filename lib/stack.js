'use strict';

// Preparing stack trace optimization

impress.shortenStack = stack => {
  if (!stack) return '';
  const nmPath = api.path.join(impress.dir, 'node_modules');
  const libPath = api.path.join(impress.dir, 'lib/');
  const result = stack
    .replace(api.common.newEscapedRegExp(nmPath), '')
    .replace(api.common.newEscapedRegExp(libPath), '')
    .replace(api.common.newEscapedRegExp(impress.dir), '');
  return result;
};

impress.findApplicationByStack = err => {
  for (const appName in impress.applications) {
    const path = api.path.join('/applications', appName);
    if (err.stack.includes(path)) return appName;
  }
  return 'impress';
};
