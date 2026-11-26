'use strict';

const { node, metarhia } = require('./deps.js');

class Place {
  constructor(name, application) {
    this.name = name;
    this.path = application.absolute(name);
    this.application = application;
  }

  relative(filePath) {
    return filePath.substring(this.path.length + 1);
  }

  async load(targetPath = this.path) {
    const isRoot = targetPath === this.path;
    if (isRoot) await metarhia.metautil.ensureDirectory(this.path);
    this.application.watcher.watch(targetPath);
    try {
      const files = await node.fsp.readdir(targetPath, { withFileTypes: true });
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { name } = file;
        if (name.startsWith('.eslint')) continue;
        const filePath = node.path.join(targetPath, name);
        if (file.isDirectory()) await this.load(filePath);
        else await this.change(filePath);
      }
    } catch (error) {
      const console = this.application.console ?? global.console;
      console.error(error.stack);
    }
  }
}

module.exports = { Place };
