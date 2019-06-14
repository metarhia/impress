(client, callback) => {
  callback(null, {
    templates: [...application.cache.templates.keys()],
    files: [...application.cache.files.keys()],
    folders: [...application.cache.folders.keys()],
    scripts: [...application.cache.scripts.keys()],
    watchers: [...application.cache.watchers.keys()],
    static: [...application.cache.static.keys()],
    pages: [...application.cache.pages.keys()],
  });
};
