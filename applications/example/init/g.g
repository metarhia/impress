function print(data) {
  console.log(JSON.stringify(data, null, 2));
}

var flower1 = { category: 'Flower', name: 'Bellis ' + process.pid };
var flower2 = { category: 'Flower', name: 'Erythronium ' + process.pid };
var kpi = { category: 'University', name: 'Kiev Polytechnic Institute ' + process.pid };

gs.connection
  .find({ category: 'Flower' })
  .order('name')
//  .projection(['id'])
//  .column()
.toArray((err, data) {
  console.dir(data);
});

/*
  { op: 'find', fn: { category: 'Buildings' } },
  { op: 'sort', fn: 'height' },
  { op: 'map', fn: [ 'id' ] },
  { op: 'column' }
*/

/*gs.connection.index({
  category: ['Flower'],
  fields: ['name'],
  unique: true,
  background: true
});

gs.connection.delete({ category: 'Flower' }, function(err, data) {
  print({ deleteFlowers: { err: err, data: data } });
  gs.connection.delete({ category: 'University' }, function(err, data) {
    print({ deleteUniversities: { err: err, data: data } });
    gs.connection.create(flower1, function(err, data) {
      print({ createFlower1: { err: err, data: data } });
      gs.connection.create(flower2, function(err, data) {
        print({ createFlower2: { err: err, data: data } });
        gs.connection.find({ category: 'Flower' }, { order: 'name', limit: 1 }, function(err, data) {
          print({ findFlowers: { err: err, data: data } });
          gs.connection.delete(data.id, function(err, data) {
            print({ deleteFlower: { err: err, data: data } });
          });
        });
      });
    });
  });
});
*/
