'use strict';

const path = require('path');
const fsp = require('fs').promises;

class Cache {
  constructor(place, application) {
    this.path = application.absolute(place);
    this.application = application;
  }

  async load(targetPath = this.path) {
    this.application.watcher.watch(targetPath);
    try {
      const files = await fsp.readdir(targetPath, { withFileTypes: true });
      for (const file of files) {
        if (file.name.startsWith('.')) continue;
        const filePath = path.join(targetPath, file.name);
        if (file.isDirectory()) await this.load(filePath);
        else await this.change(filePath);
      }
    } catch (err) {
      this.application.console.error(err.stack);
    }
  }
}

module.exports = { Cache };
