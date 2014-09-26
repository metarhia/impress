module.exports = function(client, callback) {

  // client.redirect("/"); // HTTP redirection
  // client.cache("30s");  // Cache result for 30 seconds

  client.context.data = {
    title: "Page Title",
    key: generateKey(2, '0123456789'),
    center: {
      sid: client.sid,
      empty: "",
      users: [
        { name: "vasia", age: 222, emails: ["user1@gmail.com", "user2@gmail.com"] },
        { name: "dima", age: 32, emails: ["user3@gmail.com", "user4@gmail.com", "user5@gmail.com"] },
      ],
    },
  };

  callback( /* you can assign result to client.context.data or place here as callback first parameter */);
}