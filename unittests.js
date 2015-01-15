'use strict';

require('./lib/impress');
require('./lib/impress.tests');

impress.test.show.ok = false;

require('./unittests/api.impress.test');
require('./unittests/api.definition.test');
require('./unittests/impress.application.test');
require('./unittests/impress.client.test');

impress.test.printReport();
