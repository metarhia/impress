module.exports = function(req, res, callback) {

	//console.dir(req.impress.slowTime);
	//if (req.post.loginForm) impress.redirect(res, "/");

	res.context.data = {
		title: "Page Title",
		users: [
			{ name: "vasia", age: 22, emails: ["user1@gmail.com", "user2@gmail.com"] },
			{ name: "dima", age: 32, emails: ["user3@gmail.com", "user4@gmail.com", "user5@gmail.com"] },
		],
		session: JSON.stringify(impress.sessions[req.impress.session])
	};

	callback();
}