'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { Place } = require('../lib/place.js');

const root = process.cwd();

const application = {
  path: path.join(root, 'test'),
  console,
  starts: [],
  watcher: { watch() {} },
  absolute(relative) {
    return path.join(this.path, relative);
  },
};

test('lib/place - should load place correctly', async () => {
  assert.strictEqual(typeof Place, 'function');
  assert.strictEqual(Place.name, 'Place');

  class EmptyPlace extends Place {
    constructor(place, application) {
      super(place, application);
      this.empty = true;
    }

    async change(filePath) {
      assert.strictEqual(this.constructor.name, 'EmptyPlace');
      assert.strictEqual(typeof filePath, 'string');
    }
  }

  const place = new EmptyPlace('lib', application);
  await place.load();
  assert.strictEqual(place.name, 'lib');
  assert.strictEqual(place.empty, true);
});
