module.exports = function(client, callback) {

  callback({
    title: "Override Page Title",
    center: {
      sid: client.sid,
      empty: "",
      users: [
        { name: "override-vasia", age: 22, emails: ["user1@gmail.com", "user2@gmail.com"] },
        { name: "override-dima", age: 32, emails: ["user3@gmail.com", "user4@gmail.com", "user5@gmail.com"] },
      ],
    }
  });

}