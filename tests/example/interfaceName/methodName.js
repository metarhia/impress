'use strict'

const metatests = require('metatests');
const { connect } = require('../utils');

metatests.test('interfaceName.methodName integration test', test => {
  connect((err, connection, app) => {
    test.error(err);
    test.assert(connection);
    test.assert(app);

    app.interfaceName.methodName(1,2,3, (err, res) => {
      test.error(err);
      test.strictSame(res, 6);
      test.end();
    });
  });
});
