# Changelog

## [Unreleased][unreleased]

- Use metaconfiguration (renamed @metarhia/config)
- Сorrectly handle the absence of method in api
- Fix error handling on load
- Improve Procedure class, (remove mixin, add exports field)
- Load custom interfaces in `api`
- Import auth from application

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

[unreleased]: https://github.com/metarhia/impress/compare/v2.2.0...HEAD
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
