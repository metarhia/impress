module.exports = function(client, callback) {

	//if (client.fields.loginForm) client.redirect("/");
	//console.dir(global);

	client.context.data = {
		title: "Page Title",
		users: [
			{ name: "vasia", age: 222, emails: ["user1@gmail.com", "user2@gmail.com"] },
			{ name: "dima", age: 32, emails: ["user3@gmail.com", "user4@gmail.com", "user5@gmail.com"] },
		],
		session: client.session
	};

	callback();
}