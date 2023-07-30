'use strict';

const path = require('node:path');
const metatests = require('metatests');
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

metatests.testAsync('lib/place', async (test) => {
  test.plan(17);

  test.strictSame(typeof Place, 'function');
  test.strictSame(Place.name, 'Place');

  class EmptyPlace extends Place {
    constructor(place, application) {
      super(place, application);
      this.empty = true;
    }

    async change(filePath) {
      test.strictSame(this.constructor.name, 'EmptyPlace');
      test.strictSame(typeof filePath, 'string');
    }
  }

  const place = new EmptyPlace('lib', application);
  await place.load();
  test.strictSame(place.place, 'lib');
  test.strictSame(place.empty, true);
});
