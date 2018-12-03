'use strict';

// Preparing stack trace optimization

impress.shortenStack = stack => {
  if (!stack) return '';
  if (!stack.includes(impress.dir)) return stack;
  const nmPath = '/node_modules';
  const result = stack.split(api.path.resolve(impress.dir))
    .map(line => {
      if (line.startsWith(nmPath)) return line.slice(nmPath.length);
      return line;
    })
    .join('');
  return result;
};

impress.findApplicationByStack = err => {
  for (const appName in impress.applications) {
    const path = api.path.join('/applications', appName);
    if (err.stack.includes(path)) return appName;
  }
  return 'impress';
};
