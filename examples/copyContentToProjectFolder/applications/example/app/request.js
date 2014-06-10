module.exports = function(client, callback) {

	// if (client.fields.loginForm) client.redirect("/");

	client.context.data = {
		title: "Page Title",
		key: generateKey(2, '0123456789'),
		users: [
			{ name: "vasia", age: 222, emails: ["user1@gmail.com", "user2@gmail.com"] },
			{ name: "dima", age: 32, emails: ["user3@gmail.com", "user4@gmail.com", "user5@gmail.com"] },
		],
		session: client.session
	};

	callback( /* you can assign result to client.context.data or place here as callback single parameter */);
}