'use strict';

const { node, metarhia } = require('./deps.js');

class Place {
  constructor(place, application) {
    this.place = place;
    this.path = application.absolute(place);
    this.application = application;
  }

  async load(targetPath = this.path) {
    await metarhia.metautil.ensureDirectory(this.path);
    this.application.watcher.watch(targetPath);
    try {
      const files = await node.fsp.readdir(targetPath, { withFileTypes: true });
      for (const file of files) {
        const { name } = file;
        if (name.startsWith('.eslint')) continue;
        const filePath = node.path.join(targetPath, name);
        if (file.isDirectory()) await this.load(filePath);
        else await this.change(filePath);
      }
    } catch (error) {
      const console = this.application.console || global.console;
      console.error(error.stack);
    }
  }
}

module.exports = { Place };
