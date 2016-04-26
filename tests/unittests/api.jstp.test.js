'use strict';

var jsrsObject = {
  name: 'Marcus Aurelius',
  passport: 'AE127095',
  birth: {
    date: '1990-02-15',
    place: 'Rome'
  },
  contacts: {
    email: 'marcus@aurelius.it',
    phone: '+380505551234',
    address: {
      country: 'Ukraine',
      city: 'Kiev',
      zip: '03056',
      street: 'Pobedy',
      building: '37',
      floor: '1',
      room: '158'
    }
  }
};

var jsrsString = '{name:\'Marcus Aurelius\',passport:\'AE127095\',birth:' +
  '{date:\'1990-02-15\',place:\'Rome\'},contacts:{email:\'marcus@aurelius.' +
  'it\',phone:\'+380505551234\',address:{country:\'Ukraine\',city:\'Kiev\',' +
  'zip:\'03056\',street:\'Pobedy\',building:\'37\',floor:\'1\',room:\'158\'}}}';

var jsrsWhitespacedString = '{\n' +
  '  name: \'Marcus Aurelius\',\n' +
  '  passport: \'AE127095\',\n' +
  '  birth: {\n' +
  '    date: \'1990-02-15\',\n' +
  '    place: \'Rome\'\n' +
  '  },\n' +
  '  contacts: {\n' +
  '    email: \'marcus@aurelius.it\',\n' +
  '    phone: \'+380505551234\',\n' +
  '    address: {\n' +
  '      country: \'Ukraine\',\n' +
  '      city: \'Kiev\',\n' +
  '      zip: \'03056\',\n' +
  '      street: \'Pobedy\',\n' +
  '      building: \'37\',\n' +
  '      floor: \'1\',\n' +
  '      room: \'158\'\n' +
  '    }\n' +
  '  }\n' +
  '}';

api.test.case({
  'api.jstp.stringify': [
    [ jsrsObject, jsrsString ],
  ],
  'api.jstp.parse': [
    [ jsrsString, jsrsObject ],
    [ jsrsWhitespacedString, jsrsObject ],
  ],
});
