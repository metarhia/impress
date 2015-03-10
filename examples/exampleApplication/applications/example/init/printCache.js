if (api.cluster.isWorker) {
  setInterval(function() {
    console.dir({
      //cache: JSON.stringify(Object.keys(application.cache)),
      //templates: Object.keys(application.cache.templates),
      //files: application.cache.files,
      //folders: application.cache.folders,
      //scripts: Object.keys(application.cache.scripts),
      //watchers: Object.keys(application.cache.watchers),
      //-timer: Object.keys(application.cache.timer),
      //-updates: Object.keys(application.cache.updates),
      //static: application.cache.static,
      pages: application.cache.pages,
      //-size: Object.keys(application.cache.size)
    });
  }, 5000);
}
