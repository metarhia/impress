'use strict';

const { node, metarhia } = require('./deps.js');
const { Cache } = require('./cache.js');

class Schemas extends Cache {
  constructor(place, application) {
    super(place, application);
    this.model = null;
  }

  async load(targetPath = this.path) {
    await super.load(targetPath);
    this.model = await metarhia.metaschema.loadModel(targetPath);
  }

  get(key) {
    return this.model.entities.get(key);
  }

  delete(filePath) {
    if (!this.model) return;
    const relPath = filePath.substring(this.path.length + 1);
    const name = node.path.basename(relPath, '.js');
    if (name.startsWith('.')) return;
    this.model.entities.delete(name);
    this.model.order.delete(name);
  }

  async change(filePath) {
    if (!this.model) return;
    if (!filePath.endsWith('.js')) return;
    const relPath = filePath.substring(this.path.length + 1);
    const name = node.path.basename(relPath, '.js');
    if (name.startsWith('.')) return;
    const schema = await metarhia.metaschema.loadSchema(filePath);
    this.model.entities.set(name, schema);
    this.model.preprocess();
  }
}

module.exports = { Schemas };
