gs.connection
  .find({ category: 'Flower' })
  .order('name')
//  .projection(['id'])
  .row()
  .clone()
.toArray((err, data) => {
  console.dir(data);
});
