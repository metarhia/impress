'use strict';

const { fsp, path } = require('./dependencies.js').node;

class Cache {
  constructor(place, application) {
    this.path = application.absolute(place);
    this.application = application;
  }

  async load(targetPath = this.path) {
    const files = await fsp.readdir(targetPath, { withFileTypes: true });
    for (const file of files) {
      if (file.name.startsWith('.')) continue;
      const filePath = path.join(targetPath, file.name);
      if (file.isDirectory()) await this.load(filePath);
      else await this.change(filePath);
    }
  }
}

module.exports = { Cache };
