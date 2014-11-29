'use strict';

require('./lib/impress');
require('./lib/impress.tests');

impress.test.show.ok = false;

require('./lib/global.test');
require('./lib/impress.utilities.test');
require('./lib/api.definition.test');

impress.test.printReport();
