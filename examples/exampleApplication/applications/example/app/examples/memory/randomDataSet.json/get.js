module.exports = function(client, callback) {

  var names = [
    'Plato', 'Zeno', 'Persaeus', 'Aristo', 'Apollophanes', 'Eudromus', 'Crates', 'Diogenes', 'Zenodotus', 'Basilides',
    'Antipater', 'Apollodorus', 'Archedemus', 'Panaetius', 'Boethus', 'Polemon', 'Marcus', 'Heraclides', 'Dardanus',
    'Mnesarchus', 'Stilo', 'Dionysius', 'Quintus', 'Hecato', 'Diotimus', 'Posidonius', 'Crinis', 'Diodotus', 'Jason'
  ];

  var cities = [
    'Sidon', 'Rhodes', 'Chios', 'Antioch', 'Carthage', 'Assos', 'Cyrene', 'Amphipolis', 'Soli', 'Tarsus', 'Mallus',
    'Babylon', 'Seleucia', 'Athens', 'Cyrene', 'Apamea', 'Cordylion', 'Tyre', 'Nysa', 'Alexandria', 'Hierapolis'
  ];

  var schools = [
    'Milesian', 'Xenophanes', 'Pythagoreanism', 'Heraclitus', 'Eleatic philosophy', 'Pluralism', 'Atomism',
    'Sophistry', 'Socrates', 'Plato', 'Aristotle', 'Hellenistic'
  ];

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  var res = [];

  for (var i = 0; i < 10; i++) {
    var obj = {
      name: randomItem(names),
      city: randomItem(cities),
      birth: random(1, 500) + ' ' + randomItem([ 'BC', 'AD' ]),
      age: random(25, 90),
      school: randomItem(schools)
    };
    res.push(obj);
  }

  callback(res);

};
