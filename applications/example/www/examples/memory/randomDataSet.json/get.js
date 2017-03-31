(client, callback) => {

  const test = application.test;
  const res = [];
  let i, obj;
  for (i = 0; i < 10; i++) {
    obj = {};
    obj.name = test.randomItem(test.names);
    obj.city = test.randomItem(test.cities);
    obj.birth = test.random(1, 500) + ' ' + test.randomItem(['BC', 'AD']);
    obj.age = test.random(25, 90);
    obj.school = test.randomItem(test.schools);
    res.push(obj);
  }
  callback(res);

}
