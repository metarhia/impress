'use strict';

impress.systemTemplates = {};

impress.systemTemplates.error = (title, message) => `<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
body {background:#0079a1;font-family:Verdana, sans-serif;font-size:12pt}
body,a {color:#fff}
img {float:left;margin:0 10px 0 0}
div {margin:6px}
#title {font-size:16pt}
#refresh {margin:0 0 0 30px;padding:0 0 0 22px;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgeD0iMCIgeT0iMCIgdmlld0JveD0iMCAwIDE2IDE2IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBkPSJNMi4xIDlIMC4xIDB2NWwxLjUtMS40QzIuOSAxNC43IDUuMyAxNiA4IDE2YzQuMSAwIDcuNC0zLjEgNy45LTdoLTJjLTAuNSAyLjgtMi45IDUtNS45IDUgLTIuMSAwLTQtMS4xLTUtMi43TDUuNCA5SDIuMXpNOCAwQzMuOSAwIDAuNiAzLjEgMC4xIDdoMkMyLjYgNC4yIDUgMiA4IDJjMi4yIDAgNC4xIDEuMiA1LjEgMi45TDExIDdoMiAwLjkgMkgxNlYybC0xLjQgMS40QzEzLjEgMS40IDEwLjcgMCA4IDB6IiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+) 0 0 no-repeat;background-size:contain}
#home {padding:0 0 0 22px;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgeD0iMCIgeT0iMCIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNNTEyIDMwMy41TDI1NiAxMDQuOCAwIDMwMy41di04MUwyNTYgMjMuN2wyNTYgMTk4LjdWMzAzLjV6TTQ0OCAyOTYuM3YxOTJIMzIwdi0xMjhIMTkydjEyOEg2NHYtMTkybDE5Mi0xNDRMNDQ4IDI5Ni4zeiIvPjwvc3ZnPg==) 0 0 no-repeat;background-size:contain}
</style>
</head>
<body>
<a href="/"><img width="55" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIxIiBoZWlnaHQ9IjIyMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGZpbGw9IiNmZmZmZmYiIHI9IjExMCIgY3k9IjExMC41IiBjeD0iMTEwLjUiLz48Y2lyY2xlIGZpbGw9IiMwMDc5YTEiIHI9IjgwIiBjeT0iMTEwLjUiIGN4PSIxMTAuNSIvPjxjaXJjbGUgZmlsbD0iI2ZmZmZmZiIgcj0iMjUiIGN5PSIxMTAuNSIgY3g9IjExMC41Ii8+PC9zdmc+" /></a>
<div id="title">${title}</div>
<div id="msg">${message} <a href="" id="refresh">refresh</a> <a href="/" id="home">home</a></div>
</body>
</html>`;

impress.systemTemplates.index = (title, path, files, dirs) => `<!DOCTYPE html>
<html>
<head>
<title>${title}: ${path}</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
body {background:#0079a1;font-family:Verdana, sans-serif;font-size:10pt}
body,a {color:#fff;overflow-x: hidden;white-space: nowrap}
img {float:left;margin:0 10px 0 0}
div {margin:6px}
th {text-align:left}
td, th {padding:2px 15px 2px 2px;font-weight:normal;vertical-align:top}
tr:nth-child(even) {background: inherit}
tr:nth-child(odd) {background: #007097}
tr:hover, tr.selected {background:#78cef9;color:#000;cursor:pointer}
tr:first-child {background:#fff;color:#000;cursor:default}
a {color:inherit;text-decoration:none}
#title {font-size:16pt}
#msg {font-size:12pt}
#home {padding:0 0 0 22px;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgeD0iMCIgeT0iMCIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNNTEyIDMwMy41TDI1NiAxMDQuOCAwIDMwMy41di04MUwyNTYgMjMuN2wyNTYgMTk4LjdWMzAzLjV6TTQ0OCAyOTYuM3YxOTJIMzIwdi0xMjhIMTkydjEyOEg2NHYtMTkybDE5Mi0xNDRMNDQ4IDI5Ni4zeiIvPjwvc3ZnPg==) no-repeat 0 0;background-size:contain}
#files {border-spacing:0;margin-top: 15px}
.size {text-align:right}
</style>
<script type='text/javascript'>
window.onload = () => {
  const table = document.getElementById("files");
  const rows = table.getElementsByTagName('tr');
  for (const row of rows) {
    row.onclick = function() {
      const a = this.getElementsByTagName('a')[0];
      document.location.href = a.href;
      return false;
    };
  }
  let curRow = null;
  let newRow = null;
  window.onkeydown = function(event) {
    const key = event.keyCode;
    if (key === 13 && curRow) {
      curRow.onclick.apply(curRow);
    } else if (curRow === null && [38, 40].includes(key)) {
      newRow = rows[1];
    } else if (curRow) {
      if (key === 38 && curRow.previousSibling && curRow.previousSibling.previousSibling) {
        newRow = curRow.previousSibling;
      } else if (key === 40 && curRow.nextSibling) {
        newRow = curRow.nextSibling;
      }
    }
    if (curRow) curRow.className = '';
    if (newRow) {
      newRow.className = 'selected';
      curRow = newRow;
      curRow.scrollIntoView(false);
    }
    return ![13, 38, 40].includes(key);
  };
};
</script>
</head>
<body>
<a href="/"><img width="55" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIxIiBoZWlnaHQ9IjIyMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGZpbGw9IiNmZmZmZmYiIHI9IjExMCIgY3k9IjExMC41IiBjeD0iMTEwLjUiLz48Y2lyY2xlIGZpbGw9IiMwMDc5YTEiIHI9IjgwIiBjeT0iMTEwLjUiIGN4PSIxMTAuNSIvPjxjaXJjbGUgZmlsbD0iI2ZmZmZmZiIgcj0iMjUiIGN5PSIxMTAuNSIgY3g9IjExMC41Ii8+PC9zdmc+" /></a>
<div id="title">${title}</div>
<div id="msg"><a href="/" id="home"></a>${dirs}</div>
<table id="files">
  <tr><th>Name</th><th class="size">Size</th><th>Modify time</th></tr>
  ${files}
</table>
</body>
</html>`;

impress.systemTemplates.introspection = (title, path, files, dirs) => `<!DOCTYPE html>
<html>
<head>
<title>${title}: ${path}</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
body {background:#0079a1;font-family:Verdana, sans-serif;font-size:10pt}
body,a {color:#fff;overflow-x: hidden;white-space: nowrap}
img {float:left;margin:0 10px 0 0}
div {margin:6px}
th {text-align:left}
td, th {padding:2px 15px 2px 2px;font-weight:normal;vertical-align:top}
tr:nth-child(even) {background: inherit}
tr:nth-child(odd) {background: #007097}
tr:hover, tr.selected {background:#78cef9;color:#000;cursor:pointer}
tr:first-child {background:#fff;color:#000;cursor:default}
a {color:inherit;text-decoration:none}
#title {font-size:16pt}
#msg {font-size:12pt}
#home {padding:0 0 0 22px;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgeD0iMCIgeT0iMCIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNNTEyIDMwMy41TDI1NiAxMDQuOCAwIDMwMy41di04MUwyNTYgMjMuN2wyNTYgMTk4LjdWMzAzLjV6TTQ0OCAyOTYuM3YxOTJIMzIwdi0xMjhIMTkydjEyOEg2NHYtMTkybDE5Mi0xNDRMNDQ4IDI5Ni4zeiIvPjwvc3ZnPg==) no-repeat 0 0;background-size:contain}
#files {border-spacing:0;margin-top: 15px}
</style>
<script type='text/javascript'>
window.onload = () => {
  const table = document.getElementById("files");
  const rows = table.getElementsByTagName('tr');
  for (const row of rows) {
    row.onclick = function() {
      const a = this.getElementsByTagName('a')[0];
      document.location.href = a.href;
      return false;
    };
  }
  let curRow = null;
  let newRow = null;
  window.onkeydown = function(event) {
    const key = event.keyCode;
    if (key === 13 && curRow) {
      curRow.onclick.apply(curRow);
    } else if (curRow === null && [38, 40].includes(key)) {
      newRow = rows[1];
    } else if (curRow) {
      if (key === 38 && curRow.previousSibling && curRow.previousSibling.previousSibling) {
        newRow = curRow.previousSibling;
      } else if (key === 40 && curRow.nextSibling) {
        newRow = curRow.nextSibling;
      }
    }
    if (curRow) curRow.className = '';
    if (newRow) {
      newRow.className = 'selected';
      curRow = newRow;
      curRow.scrollIntoView(false);
    }
    return ![13, 38, 40].includes(key);
  };
};
</script>
</head>
<body>
<a href="/"><img width="55" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIxIiBoZWlnaHQ9IjIyMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGZpbGw9IiNmZmZmZmYiIHI9IjExMCIgY3k9IjExMC41IiBjeD0iMTEwLjUiLz48Y2lyY2xlIGZpbGw9IiMwMDc5YTEiIHI9IjgwIiBjeT0iMTEwLjUiIGN4PSIxMTAuNSIvPjxjaXJjbGUgZmlsbD0iI2ZmZmZmZiIgcj0iMjUiIGN5PSIxMTAuNSIgY3g9IjExMC41Ii8+PC9zdmc+" /></a>
<div id="title">${title}</div>
<div id="msg"><a href="/" id="home"></a>${dirs}</div>
<table id="files">
<tr><th>Call</th><th>Method</th><th>Modify time</th></tr>
${files}
</table>
</body>
</html>`;

impress.systemTemplates.file = (name, path, method, mtime) => `<tr><td><a href="${path}">${name}</a></td><td>${method}</td><td>${mtime}</td></tr>`;
