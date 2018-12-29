(client, callback) => {

  client.context.data = {
    title: 'Page Title',
    key: api.common.generateKey(2, '0123456789'),
    center: {
      sid: client.session ? client.session.token : '',
      empty: '',
      nNull: null,
      bTrue: true,
      bFalse: false,
      dData: new Date(),
      aArray: [1, 2, 3],
      oObj: { k: { l: { m: { n: 'oppa' } } } },
      users: [
        {
          name: 'vasia',
          age: 222,
          emails: ['user1@gmail.com', 'user2@gmail.com']
        },
        {
          name: 'dima',
          age: 32,
          emails: ['user3@gmail.com', 'user4@gmail.com', 'user5@gmail.com']
        }
      ]
    }
  };

  callback();

}
