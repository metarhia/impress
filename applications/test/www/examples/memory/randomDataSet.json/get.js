(client, callback) => {

  const test = application.test;
  const res = [];
  for (let i = 0; i < 10; i++) {
    const obj = {};
    obj.name = test.randomItem(test.names);
    obj.city = test.randomItem(test.cities);
    obj.birth = test.random(1, 500) + ' ' + test.randomItem(['BC', 'AD']);
    obj.age = test.random(25, 90);
    obj.school = test.randomItem(test.schools);
    res.push(obj);
  }
  callback(null, res);

};
