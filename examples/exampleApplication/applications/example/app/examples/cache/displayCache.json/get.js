module.exports = function(client, callback) {
  callback({
    //cache: Object.keys(application.cache),
    templates: Object.keys(application.cache.templates),
    files: application.cache.files,
    folders: application.cache.folders,
    scripts: Object.keys(application.cache.scripts),
    //watchers: Object.keys(application.cache.watchers),
    //timer: Object.keys(application.cache.timer),
    //updates: Object.keys(application.cache.updates),
    static: Object.keys(application.cache.static),
    //pages: Object.keys(application.cache.pages),
    //size: Object.keys(application.cache.size)
  });
};
