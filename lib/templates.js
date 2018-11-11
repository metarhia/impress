'use strict';

// Parse template into structures
//   data <Object> object with data to be rendered using given template
//   tpl <string> template string in Impress format
//   cursor <string> dot-separated path in data object
// Returns: array of { type: string, name: string, tpl: string }
impress.parseTemplate = (data, tpl, cursor) => {
  const doc = [];
  while (tpl.length > 0) {
    // get tpl before includes
    let pos = tpl.indexOf('@[');
    if (pos === -1) {
      doc.push({ type: 'plain', name: null, tpl });
      tpl = '';
      continue;
    }
    doc.push({ type: 'plain', name: null, tpl: tpl.substr(0, pos) });
    tpl = tpl.substring(pos + 2);
    // get include name
    pos = tpl.indexOf(']@');
    const tplInclude = tpl.substr(0, pos);
    tpl = tpl.substring(pos + 2);
    const dataInclude = api.common.getByPath(
      data, (cursor ? cursor + '.' : '') + tplInclude
    );
    // find inline templates
    pos = tpl.indexOf('@[/' + tplInclude + ']@');
    let arrayIndex = 0;
    let tplBody, name;
    if (pos > -1) {
      tplBody = tpl.substr(0, pos);
      if (Array.isArray(dataInclude)) {
        for (let i = 0; i < dataInclude.length; i++) {
          name = tplInclude + '.' + arrayIndex++;
          doc.push({ type: 'inline', name, tpl: tplBody });
        }
      } else {
        doc.push({ type: 'inline', name: tplInclude, tpl: tplBody });
      }
      tpl = tpl.substring(pos + 5 + tplInclude.length);
    } else if (Array.isArray(dataInclude)) {
      // handle included templates
      for (let i = 0; i < dataInclude.length; i++) {
        name = tplInclude + '.' + arrayIndex++;
        doc.push({ type: 'include', name, tpl: null });
      }
    } else {
      doc.push({ type: 'include', name: tplInclude, tpl: null });
    }
  }
  return doc;
};
