// Example: application internal API (accessible from any place on application)

application.test = {};

application.test.names = [
  'Plato', 'Zeno', 'Persaeus', 'Aristo', 'Apollophanes', 'Eudromus',
  'Crates', 'Diogenes', 'Zenodotus', 'Basilides', 'Antipater', 'Apollodorus',
  'Archedemus', 'Panaetius', 'Boethus', 'Polemon', 'Marcus', 'Heraclides',
  'Dardanus', 'Mnesarchus', 'Stilo', 'Dionysius', 'Quintus', 'Hecato',
  'Diotimus', 'Posidonius', 'Crinis', 'Diodotus', 'Jason'
];

application.test.cities = [
  'Sidon', 'Rhodes', 'Chios', 'Antioch', 'Carthage', 'Assos', 'Cyrene',
  'Amphipolis', 'Soli', 'Tarsus', 'Mallus', 'Babylon', 'Seleucia', 'Athens',
  'Cyrene', 'Apamea', 'Cordylion', 'Tyre', 'Nysa', 'Alexandria', 'Hierapolis'
];

application.test.schools = [
  'Milesian', 'Xenophanes', 'Pythagoreanism', 'Heraclitus',
  'Eleatic philosophy', 'Pluralism', 'Atomism', 'Sophistry', 'Socrates',
  'Plato', 'Aristotle', 'Hellenistic'
];

application.test.randomItem = (arr) => (
  arr[Math.floor(Math.random() * arr.length)]
);

application.test.random = (min, max) => (
  min + Math.floor(Math.random() * (max - min + 1))
);
