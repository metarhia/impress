"use strict";

require('./lib/impress');
require('./lib/impress.tests');

impress.test.show.ok = false;

require('./lib/global.test');
require('./lib/impress.utilities.test');

impress.test.printReport();
