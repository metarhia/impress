(client, callback) => {

  callback(null, {
    title: 'Override Page Title',
    center: {
      sid: client.session ? client.session.token : '',
      empty: '',
      users: [
        {
          name: 'override-vasia',
          age: 22,
          emails: ['user1@gmail.com', 'user2@gmail.com']
        },
        {
          name: 'override-dima',
          age: 32,
          emails: ['user3@gmail.com', 'user4@gmail.com', 'user5@gmail.com']
        }
      ]
    }
  });

}
