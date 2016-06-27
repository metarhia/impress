'use strict';

var record = {
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

var recordString = '{name:\'Marcus Aurelius\',passport:\'AE127095\',birth:' +
  '{date:\'1990-02-15\',place:\'Rome\'},contacts:{email:\'marcus@aurelius.' +
  'it\',phone:\'+380505551234\',address:{country:\'Ukraine\',city:\'Kiev\',' +
  'zip:\'03056\',street:\'Pobedy\',building:\'37\',floor:\'1\',room:\'158\'}}}';

var recordWhitespacedString = '{\n' +
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

var object = {
  name: ['Marcus', 'Aurelius'].join(' '),
  passport: 'AE' + '127095',
  birth: {
    date: new Date('1990-02-15'),
    place: 'Rome'
  },
  age: function() {
    var difference = new Date() - birth.date;
    return Math.floor(difference / 31536000000);
  }
};

var objectStringWithExpressions = '{\n' +
  '  name: [\'Marcus\', \'Aurelius\'].join(\' \'),\n' +
  '  passport: \'AE\' + \'127095\',\n' +
  '  birth: {\n' +
  '    date: new Date(\'1990-02-15\'),\n' +
  '    place: \'Rome\'\n' +
  '  },\n' +
  '  age: function() {\n' +
  '    var difference = new Date() - birth.date;\n' +
  '    return Math.floor(difference / 31536000000);\n' +
  '  }\n' +
  '}';

api.test.case({
  'api.jstp.stringify': [
    [ record, recordString ],
  ],
  'api.jstp.parse': [
    [ recordString, record ],
    [ recordWhitespacedString, record ],
  ],
  'api.jstp.interprete': [
    [ objectStringWithExpressions, object ]
  ],
});
