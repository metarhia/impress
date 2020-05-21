'use strict';

const { path, fsp, vm } = require('./dependencies.js');

const SCRIPT_OPTIONS = { timeout: 5000 };

class Config {
  constructor(configPath) {
    this.sections = {};
    this.path = configPath;
    this.sandbox = vm.createContext({});
    return this.load();
  }

  async load() {
    const files = await fsp.readdir(this.path);
    for (const fileName of files) {
      await this.loadFile(fileName);
    }
    return this;
  }

  async loadFile(fileName) {
    const { name, ext } = path.parse(fileName);
    if (ext !== '.js') return;
    const configFile = path.join(this.path, fileName);
    const code = await fsp.readFile(configFile, 'utf8');
    const src = `'use strict';\n${code}`;
    const options = { filename: configFile, lineOffset: -1 };
    const script = new vm.Script(src, options);
    const exports = script.runInContext(this.sandbox, SCRIPT_OPTIONS);
    this.sections[name] = exports;
  }
}

module.exports = Config;
