0.0.8 / 2010-06-20
==================

  * Added framework optional plugins in config (e.g. db drivers)
  * Fixed db.js and db.mongodb.js to be compatible with plugins
  * All db connections and drivers are optional now (edit config.plugins.require)
  * Added mysql connection driver (wrapper for npm package mysql)
  * Added example for JSON API with mysql query (other JSON examples restructured into folders)

0.0.7 / 2010-06-17
==================

  * Empty template bug found and fixed
  * Support for template files with UTF-8 BOM (Impress removes BOM when rendering)
  * Template engine optimization
  * Fixed: impress.watchCache
  * Fixed: impress.include
  * Fixed: impress.render
  * Fixed: impress.template

0.0.6 / 2010-06-16
==================

  * Added support for optional session persistence (see config: session.persist)
  * Removed vain session deletion when session identifier is empty
  * Fixed impress.saveSession
  * Fixed impress.restoreSession

0.0.5 / 2010-06-15
==================

  * Fixed callback in impress.openDatabases
  * Fixed impress.sendCookie
  * Changed license to dual licensed the MIT or RUMI licenses

0.0.4 / 2010-06-13
==================

  * Fixed .end(), .error(), .sendCookie() and impress.process()
  * Added http error page template /lib/error.template
  * Collections mimeTypes, httpErrorCodes and customHttpCodes moved from config.js into impress.constants.js

0.0.3 / 2010-06-11
==================

  * Added template specialization for user groups. Fixed method impress.template().
    * If there is active session, Impress will search for file templateName.groupName.template
    * If no group name specified it will search for templateName.everyone.template
    * If no such file found it will take templateName.template
    * If no such file found it will look into parent directory

0.0.2 / 2010-06-10
==================

  * Fixed package structure
  * Fixed callbacks in impress.register and impress.getUser
  * Fixed impress.saveSession
  * Added and changed examples, todos, history, readme
  * Changed req.context to res.context

0.0.1 / 2010-06-08
==================

  * Initial project release
