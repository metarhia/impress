### Interface: application

#### Application()


Application interface for Impress Application Server


#### Application.prototype.constructor(name, dir)

- `name`: [`<string>`] application name
- `dir`: [`<string>`] absolute path to application directory (e.g.
      `/ias/applications/example`)

Application interface constructor


#### Application.prototype.loadDatabases(callback)

- `callback`: [`<Function>`] on databases loaded

Load application databases according to application config


#### Application.prototype.logException(err)

- `err`: [`<Error>`]

Log Error instance


#### Application.prototype.relative(path)

- `path`: [`<string>`] absolute path

_Returns:_ [`<string>`] application relative path

Get path relative path to the application


#### Application.prototype.preloadDirectory(relPath, depth, callback)

- `relPath`: [`<string>`] relative path from `www/`
- `depth`: [`<number>`] recursion depth, 0 - maximum, 1 - one level (no
      recursion)
- `callback`: [`<Function>`] on preload finished
  - `err`: [`<Error>`]` | `[`<null>`]
  - `directories`: [`<string[]>`][`<string>`]

Preload directory from `www/`


#### Application.prototype.loadApi(callback)

- `callback`: [`<Function>`] on api loaded
  - `err`: [`<Error>`]` | `[`<null>`]
  - `interfaces`: [`<string[]>`][`<string>`] array of paths to api interfaces
        folders (e.g ['/ias/api/interface1', '/ias/api/interface2'])

Load application JSTP-api from `api/` directory


#### Application.prototype.loadApiInterface(interfaceName, path, callback)

- `interfaceName`: [`<string>`] interface folder in `api/`
- `path`: [`<string>`] path to interface directory (e.g.
      `/ias/applications/example/api/interfaceName`)
- `callback`: [`<Function>`] on api interface loaded
  - `err`: [`<Error>`]` | `[`<null>`]

Load single interface for JSTP-api


#### Application.prototype.loadPlaces(callback)

- `callback`: [`<Function>`] on places loaded
  - `err`: [`<null>`]
  - `places`: [`<string[]>`][`<string>`]

Load application places.

Possible places are 'tasks', 'init', 'resources', 'setup', 'schemas',
'lib', 'api' and if serverProto is 'http' place 'www' also included


#### Application.prototype.loadPlaceScripts(placeName, callback)

- `placeName`: [`<string>`] place folder in application (e.g. 'init')
- `callback`: [`<Function>`] on place scripts loaded
  - `err`: [`<null>`]
  - `files`: [`<string[]>`][`<string>`] all files in place folder

Load scripts from single place


#### Application.prototype.processPlaceFile(placeName, path, file, callback)

- `placeName`: [`<string>`] place folder in application
- `path`: [`<string>`] path to place folder
- `file`: [`<string>`] file name in place directory
- `callback`: [`<Function>`]
  - `err`: [`<null>`]
  - `load`: [`<boolean>`] true to load, false to skip

Process place file.

If placeName is 'setup', then it will check for every script whether it was
changed since the last execution.
If it was, then it should not be loaded


#### Application.prototype.setupScriptChanged(path, file, callback)

- `path`: [`<string>`] path to place folder
- `file`: [`<string>`] file name in place directory
- `callback`: [`<Function>`]
  - `err`: [`<Error>`]
  - `changed`: [`<boolean>`] whether file was changed

Determine if the file has changed.

Read scriptName.done file and compare the time of last execution and the
time of the last file change


#### Application.prototype.loadPlaceFile(placeName, path, file, callback)

- `placeName`: [`<string>`] place folder in application
- `path`: [`<string>`] path to place folder
- `file`: [`<string>`] file name in place directory
- `callback`: [`<Function>`] file loaded

Load file from place


#### Application.prototype.dispatch(req, res)

- `req`: `<IncomingMessage>` http request
- `res`: `<ServerResponse>` http response

_Returns:_ [`<Client>`]

HTTP Dispatcher.

Create new Client instance from request and response.


#### Application.prototype.compress(filePath, stats, callback)

- `filePath`: [`<string>`] compressing file path
- `stats`: `<Stats>` instance of fs.Stats
- `callback`: [`<Function>`] (optional)
  - `err`: [`<Error>`]
  - `data`: [`<Buffer>`]
  - `compressed`: [`<boolean>`]

Refresh static in memory cache with compression and minification


#### Application.prototype.shutdownLongWorkers()


Shutdown application long workers


#### Application.prototype.handler(method, path, handler)

- `method`: [`<string>`] http verb (get, post, put, delete etc.)
- `path`: [`<string>`] path for handler
- `handler`: [`<Function>`] impress function (2 arg) or middleware (3 arg)

Programmatically create HTTP request handler


#### Application.prototype.get(path, handler)

- `path`: [`<string>`] path for handler
- `handler`: [`<Function>`] impress function (2 arg) or middleware (3 arg)

Create handler for HTTP GET method


#### Application.prototype.post(path, handler)

- `path`: [`<string>`] path for handler
- `handler`: [`<Function>`] impress function (2 arg) or middleware (3 arg)

Create handler for HTTP POST method


#### Application.prototype.put(path, handler)

- `path`: [`<string>`] path for handler
- `handler`: [`<Function>`] impress function (2 arg) or middleware (3 arg)

Create handler for HTTP PUT method


#### Application.prototype.delete(path, handler)

- `path`: [`<string>`] path for handler
- `handler`: [`<Function>`] impress function (2 arg) or middleware (3 arg)

Create handler for HTTP DELETE method


#### Application.prototype.startWorker(client, workerFile)

- `client`: [`<Client>`] client request to be processes in worker
- `workerFile`: [`<string>`] handler to be executed in forked process

Fork long worker


#### Application.prototype.stopWorker(client, workerFile)

- `client`: [`<Client>`] client request
- `workerFile`: [`<string>`] name of handler file to identify process

Kill long worker


#### Application.prototype.callMethod(connection, interfaceName, methodName, args, callback)

- `connection`: [`<Object>`] connection instance
- `interfaceName`: [`<string>`] name of the interface
- `methodName`: [`<string>`] name of the method
- `args`: [`<Array>`] method arguments (including callback)
- `callback`: [`<Function>`]

Call application method with JSTP


#### Application.prototype.getMethods(interfaceName)

- `interfaceName`: [`<string>`] name of the interface to inspect

Get an array of methods of an interface


[`<Buffer>`]: https://nodejs.org/api/buffer.html#buffer_class_buffer
[`<Client>`]: https://github.com/metarhia/impress/blob/master/lib/client.js
[`<Object>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[`<Function>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
[`<Array>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
[`<Error>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
[`<boolean>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type
[`<null>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Null_type
[`<number>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type
[`<string>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type
