application.test = {};

application.test.names = [
  'Plato', 'Zeno', 'Persaeus', 'Aristo', 'Apollophanes', 'Eudromus', 'Crates', 'Diogenes', 'Zenodotus', 'Basilides',
  'Antipater', 'Apollodorus', 'Archedemus', 'Panaetius', 'Boethus', 'Polemon', 'Marcus', 'Heraclides', 'Dardanus',
  'Mnesarchus', 'Stilo', 'Dionysius', 'Quintus', 'Hecato', 'Diotimus', 'Posidonius', 'Crinis', 'Diodotus', 'Jason'
];

application.test.cities = [
  'Sidon', 'Rhodes', 'Chios', 'Antioch', 'Carthage', 'Assos', 'Cyrene', 'Amphipolis', 'Soli', 'Tarsus', 'Mallus',
  'Babylon', 'Seleucia', 'Athens', 'Cyrene', 'Apamea', 'Cordylion', 'Tyre', 'Nysa', 'Alexandria', 'Hierapolis'
];

application.test.schools = [
  'Milesian', 'Xenophanes', 'Pythagoreanism', 'Heraclitus', 'Eleatic philosophy', 'Pluralism', 'Atomism',
  'Sophistry', 'Socrates', 'Plato', 'Aristotle', 'Hellenistic'
];

application.test.randomItem = function(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};

application.test.random = function(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
};

module.exports = function(client, callback) {

  var test = application.test,
      res = [];
  for (var i = 0; i < 10; i++) {
    var obj = {};
    obj.name = test.randomItem(test.names);
    obj.city = test.randomItem(test.cities);
    obj.birth = test.random(1, 500) + ' ' + test.randomItem(['BC', 'AD']);
    obj.age = test.random(25, 90);
    obj.school = test.randomItem(test.schools);
    res.push(obj);
  }
  callback(res);

};
