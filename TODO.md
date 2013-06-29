# TODO

## Improvements

* Load virtual host separated config files from folder
* Separate database access for different sites/applications
* Add support for file uploads (POST requests)
* Add static files memory caching
* Add geoIP lookup
* Add json api example 'auth' for registration, sign in, sign out, recovery password and so on
* Add examples with web GUI controls
* Add handlers for .xml and .form folder extensions
* Add simple cms plugin with mongoDB storage
* Add mongoDB backup/restore
* Add Long-pooling
* Fork url-handlers as separate process for long processing (to be implemented)
* Make config parameters optional, prosess, route, hosts, etc.
* Do not remove session cookie when sign out, just unlink session and associater user account
* Send SSE multicast to othr processes using IPC

## Bugs

* Add error messages when starting second copy on same config
