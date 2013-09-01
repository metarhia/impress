module.exports = function(req, res, callback) {
	res.context.data = {
		title: "Override Page Title",
		users: [
			{ name: "override-vasia", age: 22, emails: ["user1@gmail.com", "user2@gmail.com"] },
			{ name: "override-dima", age: 32, emails: ["user3@gmail.com", "user4@gmail.com", "user5@gmail.com"] },
		],
		session: JSON.stringify(impress.sessions[req.impress.session])
	};
	callback();
}