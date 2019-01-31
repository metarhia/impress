### Interface: client

#### Client()

HTTP Client interface for Impress Application Server


#### Client.prototype.constructor(application, req, res)

- `application`: [`<Application>`] instance of impress.Application
- `req`: [`<http.IncomingMessage>`]
- `res`: [`<http.ServerResponse>`]

Client constructor


#### Client.prototype.parseCookies()

Convert cookie string from request's headers to `client.cookies` object

_Example:_
```js
 'name=value; path=/' => { name: 'value', path: '/' }
```


#### Client.prototype.setCookie(name, value, host, httpOnly)

- `name`: [`<string>`] cookie name
- `value`: [`<string>`] cookie value
- `host`: [`<string>`] host name, optional, default: client.req.headers.host
- `httpOnly`: [`<boolean>`] HttpOnly cookie modifier, optional, default: true

Set cookie by adding it to `client.preparedCookies`


#### Client.prototype.deleteCookie(name, host)

- `name`: [`<string>`] cookie name
- `host`: [`<string>`] optional, default: client.req.headers.host

Delete cookie


#### Client.prototype.sendCookie()

Set all prepared cookies if headers have not been sent yet


#### Client.prototype.proxy(hostname, port, path)

- `hostname`: [`<string>`] forward request to host name or IP address
- `port`: [`<number>`] request port
- `path`: [`<string>`] request path

Route request to external HTTP server


#### Client.prototype.dispatch()

Client dispatch.

Check application firewall access, in case if access is allowed
parse cookies, restore client session and process request.
Otherwise following status codes can be sent:
- `403 Forbidden` client error status response code if access denied
- `429 Too Many Requests` response status code if access limited
- `400 Bad Request` response status code in other cases


#### Client.prototype.block(msec)

- `msec`: [`<number>`]` | `[`<string>`] milliseconds or duration of client
      blocking

Add current client to deny list by IP and Token if session exists.

Send `403 Forbidden` client error status response code afterwards


#### Client.prototype.processing()

Process request.

If requested page is already cached, send it and end response.
Otherwise check client access and execute an appropriate
handler file for request's method, end response accordingly


#### Client.prototype.basicAuth()

Handle basic access authentication.

Check authorization base64 encoded credentials if
client request contains `Authorization` header.
In case check failed or `Authorization` header has not been set,
send `401 Unauthorized` client error status response code along
with `WWW-Authenticate` header.
As long as base64 is a reversible encoding, the basic authentication
is not secure, so HTTPS/TLS should be used in combination
with basic authentication for additional security.


#### Client.prototype.allowOrigin()

Specify an allowed origin.

Set `Access-Control-Allow-Origin` header
if application config defines allowOrigin, default: not set


#### Client.prototype.defaultContentType()

Set `Content-Type` header with an appropriate MIME type of returned data


#### Client.prototype.processingPage()

Process HTML page by sending html template and ending response.

If cannot read template file, `500 Internal Server Error`
server error response code is sent


#### Client.prototype.cache(timeout)

- `timeout`: [`<number>`]` | `[`<string>`] milliseconds or duration

Cache URL response


#### Client.prototype.end(output)

- `output`: [`<string>`]` | `[`<Object>`]` | `[`<Buffer>`]
  - `stats`: [`<fs.Stats>`] instance of fs.Stats
  - `compressed`: [`<boolean>`] gzip compression flag
  - `data`: [`<Buffer>`] to send

End response


#### Client.prototype.saveCache(data)

- `data`: [`<string>`]

Save cache in `client.application.cache.pages`


#### Client.prototype.sendCache(cache)

- `cache`: [`<Object>`]
  - `expireTime`: [`<number>`] cache expiration time
  - `statusCode`: [`<number>`] response status code
  - `contentType`: [`<string>`] data type, `Content-Type` header
  - `contentEncoding`: [`<string>`] data encoding, `Content-Encoding` header
  - `stats`: [`<Object>`]
    - `size`: [`<number>`] data length, `Content-Length` header
    - `mtime`: [`<number>`]` | `[`<bigint>`] last modified in milliseconds
    - `time`: [`<string>`] `Last-Modified` header
  - `data`: [`<string>`]

Send cache data. Set appropriate headers and end response


#### Client.prototype.error(code, message)

- `code`: [`<number>`] HTTP status code
- `message`: [`<string>`] error message, optional

End response with HTTP error code


#### Client.prototype.redirect(location)

- `location`: [`<string>`] URL to redirect a page to

Redirect to specified location.

`Location` header would be set in case headers have not sent yet.


#### Client.prototype.inherited(callback)

- `callback`: [`<Function>`] after inherited handler
  - `err`: [`<Error>`]

Inherit behavior from parent directory


#### Client.prototype.fileHandler(handler, inheritance, callback)

- `handler`: [`<string>`] handler name (e.g. `access`, `get`, `post` etc.)
- `inheritance`: [`<boolean>`] flag, true if called from inherited
- `callback`: [`<Function>`] after fileHandler executed
  - `err`: [`<Error>`]

Execute handler script file for the request.

Run an appropriate handler file for request method(get, post, put,
delete, patch, head) or access handler for access configuration.
Files should be named in accordance to method it handles (e.g. `get.js`)


#### Client.prototype.detectRealPath(callback)

- `callback`: [`<Function>`] after path detected

Find nearest existent folder


#### Client.prototype.calculateAccess()

Check whether access is allowed or not based on `client.access` options.

Default access options:
- guests, allow access for non-authenticated connections - `true`
- logged, allow access for authenticated connections - `true`
- http, allow via HTTP - `true`
- https, allow via HTTPS -  `true`
- intro, allow API introspection - `false`
- virtual, allow virtual folders otherwise reply with 404 - `false`
- groups, allow access for certain groups, empty allows for all - `[]`


#### Client.prototype.runScript(handler, fileName, callback)

- `handler`: [`<string>`] handler name
- `fileName`: [`<string>`] file name
- `callback`: [`<Function>`] after handler executed
  - `err`: [`<Error>`]

Run script in client context if access is allowed.

Configure access options if `access`.
Otherwise execute function from handler file


#### Client.prototype.executeFunction(fn, callback)

- `fn`: [`<Function>`] to be executed
- `callback`: [`<Function>`]
  - `err`: [`<Error>`]

Execute function in client context


#### Client.prototype.static(onNotServed)

- `onNotServed`: [`<Function>`] execute if file is not static

Send static file and close connection


#### Client.prototype.staticCache(relPath, onNotServed)

- `relPath`: [`<string>`] relative path is a cash index
- `onNotServed`: [`<Function>`] if not served

Send static data from `client.application.cache.static`


#### Client.prototype.serveStatic(relPath, onNotServed)

- `relPath`: [`<string>`] application relative path to file
- `onNotServed`: [`<Function>`] if not static

Serve static file


#### Client.prototype.staticFile(filePath, relPath, stats)

- `filePath`: [`<string>`] absolute path to file
- `relPath`: [`<string>`] application relative path to file
- `stats`: [`<fs.Stats>`] instance of fs.Stats

Send compressed static file and end response.

If the file cannot be read `404 Not Found`
client error status response code is sent


#### Client.prototype.buffer(cache)

- `cache`: [`<Object>`]
  - `stats`: [`<fs.Stats>`] instance of fs.Stats
  - `compressed`: [`<boolean>`] gzip compression flag
  - `data`: [`<Buffer>`] to send

Send static buffer and end response.

If cache was not modified `304 Not Modified`
client redirection response code is sent


#### Client.prototype.compress(filePath, stats)

- `filePath`: [`<string>`] path to handler (from application base directory)
- `stats`: [`<fs.Stats>`] instance of fs.Stats

Refresh static in memory cache with compression and minification.

If cache was not modified, `304 Not Modified` client redirection
response code is sent. If cannot read file, `404 Not Found` client error
status response code is sent


#### Client.prototype.attachment(attachmentName, size, lastModified)

- `attachmentName`: [`<string>`] name to save downloaded file
- `size`: [`<number>`] set Content-Length header, optional
- `lastModified`: [`<string>`] set Last-Modified header, optional

Generate HTTP file attachment


#### Client.prototype.download(filePath, attachmentName, callback)

- `filePath`: [`<string>`] file to download
- `attachmentName`: [`<string>`] name to save downloaded file, optional,
      default: basename of filePath
- `callback`: [`<Function>`] after file downloaded

Download file generating a file attachment.

If cannot read file, `404 Not Found`
client error status response code is sent


#### Client.prototype.upload(each, callback)

- `each`: [`<Function>`] on processing each file
  - `err`: [`<Error>`]
  - `data`: [`<Object>`]
    - `compressionFlag`: [`<string>`] how file was compressed `N`(not
          compressed), `Z`(zip compressed), `G`(gzip compressed)
    - `originalName`: [`<string>`] filename
    - `storageName`: [`<string>`] generated key
    - `storagePath`: [`<string>`] storage path
    - `originalHash`: [`<string>`] hash
    - `originalSize`: [`<number>`] size of file in bytes
    - `storageSize`: [`<number>`] size of file in bytes
- `callback`: [`<Function>`]
  - `err`: [`<Error>`]
  - `count`: [`<number>`] amount of files

Upload file


#### Client.prototype.stream(filePath, stats)

- `filePath`: [`<string>`] absolute path to file
- `stats`: [`<fs.Stats>`] instance of fs.Stats

Sending file stream


#### Client.prototype.index(indexPath)

- `indexPath`: [`<string>`] path to directory

Send HTML template with directory index, end response.

If in application's static files configuration `index` is set
to `false` (allowed displaying HTTP directory index for /static if true)
`403 Forbidden` client error status response code is sent


#### Client.prototype.introspect()

Send HTML template with API introspection index, end response.

Called if in client access configuration `intro` is set to `true`.
If cannot read directory by client.path, `404 Not Found` client error
status response code is sent


#### Client.prototype.template(file, callback)

- `file`: [`<string>`] template file name
- `callback`: [`<Function>`]
  - `err`: [`<Error>`]
  - `res`: [`<string>`] requested template

Render template from file or return template from cache if it exists


[`<Application>`]: https://github.com/metarhia/impress/blob/master/lib/application.js
[`<http.IncomingMessage>`]: https://nodejs.org/api/http.html#http_class_http_incomingmessage
[`<http.ServerResponse>`]: https://nodejs.org/api/http.html#http_class_http_serverresponse
[`<Buffer>`]: https://nodejs.org/api/buffer.html#buffer_class_buffer
[`<fs.Stats>`]: https://nodejs.org/api/fs.html#fs_class_fs_stats
[`<bigint>`]: https://github.com/tc39/proposal-bigint
[`<Object>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[`<Function>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
[`<Error>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
[`<boolean>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type
[`<number>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type
[`<string>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type
