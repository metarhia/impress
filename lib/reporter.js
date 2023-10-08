'use strict';

const application = require('./application.js');

module.exports = async function* reporter(source) {
  for await (const event of source) {
    if (event.type === 'test:pass') {
      application.test.passed++;
      application.console.debug(`✅ Test ${event.data.name} passed`);
    } else if (event.type === 'test:fail') {
      application.test.failed++;
      application.console.error(`❌ Test ${event.data.name} failed`);
    }
    yield '';
  }
};
