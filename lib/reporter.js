'use strict';

const application = require('./application.js');

module.exports = async function* reporter(source) {
  for await (const event of source) {
    if (event.type === 'test:pass') {
      application.test.passed++;
      const { name, details } = event.data;
      const duration = details['duration_ms'];
      application.console.debug(`✅ Passed: ${name} (${duration}ms)`);
    } else if (event.type === 'test:fail') {
      application.test.failed++;
      const { name, details } = event.data;
      const duration = details['duration_ms'] ?? 0;
      const { cause } = details.error;
      const msg = typeof cause === 'string' ? cause : cause?.stack || '';
      application.console.error(`❌ Failed: ${name} (${duration}ms)\n${msg}`);
    }
    yield '';
  }
};
