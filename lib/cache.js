'use strict';

const path = require('path');
const fsp = require('fs').promises;

class Cache {
  constructor(place, application) {
    this.place = place;
    this.path = application.absolute(place);
    this.application = application;
  }

  async load(targetPath = this.path) {
    this.application.watcher.watch(targetPath);
    try {
      const files = await fsp.readdir(targetPath, { withFileTypes: true });
      for (const file of files) {
        const { name } = file;
        if (name.startsWith('.') && !name.endsWith('.js')) continue;
        const filePath = path.join(targetPath, name);
        if (file.isDirectory()) await this.load(filePath);
        else await this.change(filePath);
      }
    } catch (err) {
      this.application.console.error(err.stack);
    }
  }
}

module.exports = { Cache };
