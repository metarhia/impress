module.exports = function(client, callback) {
	impress.security.signIn(client, function(isSuccess) {
		if (isSuccess) client.context.data = { Result: "Ok" };
		else client.context.data = { Result: "Error" };
		if (client.fields.loginForm) client.redirect("/");
		callback();
	});
}