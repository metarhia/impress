# Changelog

## [3.1.2][] - 2025-09-29

- Fix worker: invoke handler for scheduler

## [3.1.1][] - 2025-09-21

- Fix TypeError: domain.enter is not a function
- Remove node:repl from autoloaded dependencies
- Remove node:sea from autoloaded dependencies

## [3.1.0][] - 2025-09-20

- Migrate from metatests to Node.js native test runner
- Remove metatests dependency
- Node.js engines now: >= 18.15
- Add custom URL params (queries) support for bus
- Implement custom headers support for bus
- Load schemas before db and libs (fixes #1983)
- Update all dependencies to latest versions
- Update AUTHORS file with all contributors
- Update README requirements with current versions

## [3.0.18][] - 2025-06-06

- Remove deprecated and invalid internal modules from loader
- Update dependencies

## [3.0.17][] - 2025-05-25

- Add node.js 24 to CI
- Update dependencies

## [3.0.16][] - 2024-09-01

- Update eslint to 9.x and prettier with configs
- Add node.js 22 to CI

## [3.0.15][] - 2024-04-27

- Update dependencies to fix metacom compatibility

## [3.0.14][] - 2024-02-12

- Fixed API endpoints local queue settings applying
- Worker task execution global timeout implementation
- Reimplement global timeouts.request usage during a Procedure invocation
- Fix worker exit error: catch and restart (e.g. memoy leaks)
- Refactor procedure timeout
- Rewrite `invoke` without ports, including timeouts and thread pool
- Fix timers namespace: due to changes in `node:timers/promises`

## [3.0.13][] - 2023-10-22

- Fix serve static not in cache (e.g. certbot challenge)
- Fix `application.invoke` availability on `start` hook
- Support node.js 21.x

## [3.0.12][] - 2023-10-22

- Update metacom and metautil with important error.code and timeout fixes
- Update metalog with fixed buffering

## [3.0.11][] - 2023-10-12

- Fix reporter path: add `file://` to support windows
- Optimize cross-worker invocation

## [3.0.10][] - 2023-10-10

- Run tests on `ready` (all workers started)
- Support units without version: `api/example` instead of `api/example.1`

## [3.0.9][] - 2023-10-09

- Fixed outupt stack traces and test duration

## [3.0.8][] - 2023-10-09

- Integration with custom test reporter
- Implement test timeout
- Metacom fix: do not serve API over http and ws on balancing port

## [3.0.7][] - 2023-10-06

- Fixed imtegration with node.js native test runner for windows

## [3.0.6][] - 2023-10-06

- Fixed static server for windows
- Fixed restart on EADDRINUSE
- Fixed unicode content length in JSON serialization
- Drop node.js 16 and 19, update dependencies

## [3.0.5][] - 2023-09-13

- Implemented virtual paths with page templates
- Implemented custom erro pages 404, 500...
- Fixed integration with native node.js test runner
- Fixed process exit code

## [3.0.4][] - 2023-09-09

- Fix bug serving empty folders
- Fix for node.js 20: writing headers after they are sent to the client
- Move semaphore from metacom to `Application`
- Integrate native node.js tests into metarhia

## [3.0.3][] - 2023-08-14

- Fix `MessagePort` leak
- Support submodules in autoloader
- Update metacom with latest bugfixes

## [3.0.2][] - 2023-07-31

- Require dependencies from application, not from impress
- Support new globals: fetch, AbortController, Event, EventTarget,
  MessageChannel, MessageEvent, MessagePort
- Create `application/tasks` directory if not exists
- Refactor `Place` class and all child classes

## [3.0.1][] - 2023-07-23

- Fix noncritical bugs, restructure, rename and reorganize modules
- Update dependencies, improve code style, apply eslint: consistent-return
- Add more tests for application server, move some code to metautil

## [3.0.0][] - 2023-06-30

- Worker-based multitenancy implementation
- Support metacom bi-directional streams
- Support HTTP 206 and 416, Partial content (Range)
- Move `serveStatic` from metacom
- Support miltiple domains and multiple SSL certificates with SNI
- Support large files streaming from disk without memory cache
- Now impress works with certbot and supports `--webroot` mode
- Add `node:` prefix in require for built-in modules
- Drop node.js 14 support, add node.js 20
- Convert package_lock.json to lockfileVersion 2
- Initial integration bus implementation (new place `application/bus`)
- Fix shutdown while initialization
- Server config `cors.origin` is now optional
- Update metalog and allow 'json' parameter
- Use native AbortController
- Remove deprecated node:url
- Update dependencies

## [2.6.10][] - 2022-05-09

- Do not call stop() on directories during shutdown
- Use config for logger initialization in thread 0
- Fix application init order
- Do not shotdown if not started

## [2.6.9][] - 2022-04-01

## [2.6.8][] - 2022-03-19

- Add error handler for logger in master and worker threads

## [2.6.7][] - 2022-03-18

- Add cors to server config
- Update metatests dependency
- Allow `async` procedure `validate` function
- Emit application init events on user application
- Try to coerce dependency names under `node`, `npm`, `metarhia` keys.
  dependencies with '/', '@', '-' will also be available by removing those
  symbols and converting name to camelCase format.
  e.g `@metahia/common` -> `metarhiaCommon`, `date-fns` -> `dateFns`.
- Improve application/worker error logs
- Update dependencies

## [2.6.6][] - 2021-10-12

- Move `node.process` object to a sandbox context
- Make `scheduler` field optional in `config/server.js`
- Update dependencies to fix security and metacom

## [2.6.5][] - 2021-09-30

- Fix: do not release thread if invoke is not exclusive
- Fix: write `task.id` to serialized task `.json` file

## [2.6.4][] - 2021-09-23

- Dependency loader fixed, `metasql` is optional now
- Update `metacom` and `metautil` with bugfixes

## [2.6.3][] - 2021-09-22

- Implement exclusive thread capture to execute `application.invoke`
- Wait for exclusive thread capture timeout

## [2.6.2][] - 2021-09-12

- Update metacom to prevent instalations with critical bug

## [2.6.1][] - 2021-09-10

- Quick (not optimal) implementation of `application.invoke`
- Refactor impress internal dependencies loading
- Remove access to `worker_threads` from application
- Execute tasks in thread pool

## [2.6.0][] - 2021-09-08

- Allow third party plugins (not only metarhia npm modules)
- Scheduler: return task id from `Scheduler.add(task: Task): Promise<string>`
- Log error and exit process if can't load dependencies
- Fix process exit if thread terminated at the initialization phase

## [2.5.3][] - 2021-08-19

- Don't load sql from `application/schemas`
- Support custom key method in `Procedure` (pass `name` to constructor)
- Pass `context` to plugins and hooks

## [2.5.2][] - 2021-08-06

- Update dependencies for network layer (metacom and ws)

## [2.5.1][] - 2021-07-30

- Separate queue for each task name (topics)
- Add place `db` for data access layer

## [2.5.0][] - 2021-07-22

- Rework scheduler, use `every` syntax
- Run scheduler in separate thread
- Use `Semaphore` to organize task queue in scheduler thread

## [2.4.3][] - 2021-07-10

- Drop private fields support for modules
- Update metacom to 1.8.1 (bug fixes)

## [2.4.2][] - 2021-07-07

- Remove duplicated config validation
- Support custom api routers

## [2.4.1][] - 2021-07-01

- Implement basic API plugin system
- Update dependencies including metacom and metaschema

## [2.4.0][] - 2021-06-26

- Use references to schemas in API definition
- Allow optional balancer in config

## [2.3.2][] - 2021-06-06

- Move @types/ws to dev dependencies to reduce prod module size

## [2.3.1][] - 2021-06-03

- Auto load and reload schemas
- Update dependencies (security reasons)

## [2.3.0][] - 2021-05-24

- Use metaconfiguration (renamed @metarhia/config)
- Сorrectly handle the absence of method in api
- Fix error handling on load
- Improve Procedure class, (remove mixin, add exports field)
- Load custom interfaces in `api`
- Import auth from application
- Implement default auth stub module

## [2.2.0][] - 2021-04-15

- Add tipings for Metarhia libraries
- Add typings for global namespaces

## [2.1.2][] - 2021-04-07

- Stop module only if module folder removed, not just `stop.js` file
- Update metawatch to fix bug: load created directory after delete

## [2.1.1][] - 2021-03-30

- Use metawatch instead of internal watcher
- Remove resources from memory on metawatch 'delete'
- Decompose class Application into Cache, Modules, Interfaces, Resources
- Fix domain and lib live reload bugs

## [2.1.0][] - 2021-03-15

- Improve server start and stop
- Implmenent port re-bind
- Unify logging output (before log init)
- Disable Nagle's algorithm if configured
- Improve config schemas

## [2.0.14][] - 2021-03-13

- Use metaschema for config validation

## [2.0.13][] - 2021-03-05

- Remove Schema and use metaschema instead
- Add .d.ts typing

## [2.0.12][] - 2021-03-02

- Schema field shorthand
- Rewrite README.md

## [2.0.11][] - 2021-02-28

- Schema for collections: array, object, set, map
- Change queue configuration: https://github.com/metarhia/impress/issues/1484

## [2.0.10][] - 2021-02-24

- Fix bug in Procedure locking with semaphore
- Procedure execution timeout
- Schema custom validation method
- Support nested schemas
- Added config schemas

## [2.0.9][] - 2021-02-19

- Extract Procedure class from Application
- Update metautil to 3.3.0 and metacom to 1.5.1

## [2.0.8][] - 2021-02-17

- Use schema validation in `application.invoke`
- Optimize module loader and signature cache
- Reworked application api in-memory structure
- Precompile api validation schemas

## [2.0.7][] - 2021-02-13

- Update metarhia/config to 2.1.0
- Add access to the environment variables from configs via `process.env`
- Handle startup exceptions: can't read config

## [2.0.6][] - 2021-02-09

- Revert to lock-file version 1
- Use metacom 1.3.1 to revert its lock-file version 1
- Publish fixed memory leak in metacom 1.3.1

## [2.0.5][] - 2021-02-07

- Removed Channel injection to metacom.Server
- Fixed bugs amd memory leaks in metacom, update to 1.3.0
- Changed Server.constructor signature from
  `(config, { Channel, application })` to `(config, application)`
  so should be published with new version of metacom, see:
  https://github.com/metarhia/metacom/issues/127

## [2.0.4][] - 2021-02-04

- Load TLS certificates only if we need HTTPS or WSS
- Move hashPassword and validatePassword to metautil
- Move cookies operations to metacom

## [2.0.3][] - 2021-01-29

- Fixed exception handling in module loader
- Added relative path in logged stack traces
- Fixed application initializtion flag
- Catch exceptions in application initialization

## [2.0.2][] - 2021-01-26

- Move utils to metautil
- Implement schemas for structures and scalars
- Fixed path separators to support windows

## [2.0.1][] - 2021-01-09

- Use metautil instead of metarhia/common for core utilities
- Fixed spelling in function name: nkdirp -> mkdirp

## [2.0.0][] - 2020-12-21

- Single application with code live reload and auto API routing
- Graceful shutdown and application state recovery after reload
- Minimum code size and dependencies
- Scale with threads with code sandboxing, DI and context isolation
- Inter-process communication and shared memory used for state management
- Support protocols: HTTP, HTTPS, WS, WSS, Metacom with REST and RPC
- Support logging, configuration, task scheduling
- Database access layer for PostgreSQL with migrations and query builder
- Persistent sessions support with authentication, groups and anonymous
- Request queue with timeout and size, execution timeout and error handling

## [1.0.9][] - 2019-01-18

First generation of application server with following features

- Support multiple applications and sites with sandboxing and auto-reload
- Serve multiple domains, ports, network interfaces, hosts and protocols
- Scale with processes with IPC
- Support protocols: JSTP, TCP, UDP, WS, WSS, HTTP, HTTPS with REST or RPC
- Built-in auth subsystem with sessions
- Support logging, configuration, file upload and download, reverse-proxy
- Connection drivers for database engines: MongoDB, PgSQL, Oracle, MySQL
- Support GeoIP, health monitoring, task scheduling, server-side templating

[3.1.2]: https://github.com/metarhia/impress/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/metarhia/impress/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/metarhia/impress/compare/v3.0.18...v3.1.0
[3.0.18]: https://github.com/metarhia/impress/compare/v3.0.17...v3.0.18
[3.0.17]: https://github.com/metarhia/impress/compare/v3.0.16...v3.0.17
[3.0.16]: https://github.com/metarhia/impress/compare/v3.0.15...v3.0.16
[3.0.15]: https://github.com/metarhia/impress/compare/v3.0.14...v3.0.15
[3.0.14]: https://github.com/metarhia/impress/compare/v3.0.13...v3.0.14
[3.0.13]: https://github.com/metarhia/impress/compare/v3.0.12...v3.0.13
[3.0.12]: https://github.com/metarhia/impress/compare/v3.0.11...v3.0.12
[3.0.11]: https://github.com/metarhia/impress/compare/v3.0.10...v3.0.11
[3.0.10]: https://github.com/metarhia/impress/compare/v3.0.9...v3.0.10
[3.0.9]: https://github.com/metarhia/impress/compare/v3.0.8...v3.0.9
[3.0.8]: https://github.com/metarhia/impress/compare/v3.0.7...v3.0.8
[3.0.7]: https://github.com/metarhia/impress/compare/v3.0.6...v3.0.7
[3.0.6]: https://github.com/metarhia/impress/compare/v3.0.5...v3.0.6
[3.0.5]: https://github.com/metarhia/impress/compare/v3.0.4...v3.0.5
[3.0.4]: https://github.com/metarhia/impress/compare/v3.0.3...v3.0.4
[3.0.3]: https://github.com/metarhia/impress/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/metarhia/impress/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/metarhia/impress/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/metarhia/impress/compare/v2.6.10...v3.0.0
[2.6.10]: https://github.com/metarhia/impress/compare/v2.6.9...v2.6.10
[2.6.9]: https://github.com/metarhia/impress/compare/v2.6.8...v2.6.9
[2.6.8]: https://github.com/metarhia/impress/compare/v2.6.7...v2.6.8
[2.6.7]: https://github.com/metarhia/impress/compare/v2.6.6...v2.6.7
[2.6.6]: https://github.com/metarhia/impress/compare/v2.6.5...v2.6.6
[2.6.5]: https://github.com/metarhia/impress/compare/v2.6.4...v2.6.5
[2.6.4]: https://github.com/metarhia/impress/compare/v2.6.3...v2.6.4
[2.6.3]: https://github.com/metarhia/impress/compare/v2.6.2...v2.6.3
[2.6.2]: https://github.com/metarhia/impress/compare/v2.6.1...v2.6.2
[2.6.1]: https://github.com/metarhia/impress/compare/v2.6.0...v2.6.1
[2.6.0]: https://github.com/metarhia/impress/compare/v2.5.3...v2.6.0
[2.5.3]: https://github.com/metarhia/impress/compare/v2.5.2...v2.5.3
[2.5.2]: https://github.com/metarhia/impress/compare/v2.5.1...v2.5.2
[2.5.1]: https://github.com/metarhia/impress/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/metarhia/impress/compare/v2.4.3...v2.5.0
[2.4.3]: https://github.com/metarhia/impress/compare/v2.4.2...v2.4.3
[2.4.2]: https://github.com/metarhia/impress/compare/v2.4.1...v2.4.2
[2.4.1]: https://github.com/metarhia/impress/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/metarhia/impress/compare/v2.3.2...v2.4.0
[2.3.2]: https://github.com/metarhia/impress/compare/v2.3.1...v2.3.2
[2.3.1]: https://github.com/metarhia/impress/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/metarhia/impress/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/metarhia/impress/compare/v2.1.2...v2.2.0
[2.1.2]: https://github.com/metarhia/impress/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/metarhia/impress/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/metarhia/impress/compare/v2.0.14...v2.1.0
[2.0.14]: https://github.com/metarhia/impress/compare/v2.0.13...v2.0.14
[2.0.13]: https://github.com/metarhia/impress/compare/v2.0.12...v2.0.13
[2.0.12]: https://github.com/metarhia/impress/compare/v2.0.11...v2.0.12
[2.0.11]: https://github.com/metarhia/impress/compare/v2.0.10...v2.0.11
[2.0.10]: https://github.com/metarhia/impress/compare/v2.0.9...v2.0.10
[2.0.9]: https://github.com/metarhia/impress/compare/v2.0.8...v2.0.9
[2.0.8]: https://github.com/metarhia/impress/compare/v2.0.7...v2.0.8
[2.0.7]: https://github.com/metarhia/impress/compare/v2.0.6...v2.0.7
[2.0.6]: https://github.com/metarhia/impress/compare/v2.0.5...v2.0.6
[2.0.5]: https://github.com/metarhia/impress/compare/v2.0.4...v2.0.5
[2.0.4]: https://github.com/metarhia/impress/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/metarhia/impress/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/metarhia/impress/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/metarhia/impress/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/metarhia/impress/compare/v1.0.9...v2.0.0
[1.0.9]: https://github.com/metarhia/impress/releases/tag/v1.0.9
