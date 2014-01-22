(function(impress) {

	// TODO: test security against v0.1.1

	impress.security = {};

	// session is associated with user if optional field session.userId present and not null

	impress.security.user = function(aUser) {
		return global.extend(aUser || {}, {
			// userId: "", // unique identifier
			// login:  "", // from db (optional)
			// group:  "", // from db (optional)
			sessions:  [], // one user can have many sessions
			data:      {}, // user accessed data cache
			sse:       {}, // SSE/EventStream sockets to send events
			access:    new Date() // last access time
		});
	};

	// Get user for given session or {}
	//
	impress.security.getSessionUser = function(application, sid) {
		var userId = application.sessions[sid].userId;
		return userId ? application.users[userId] : {};
	}

	var singleWarining = true;

	function showWarning() {
		if (singleWarining) {
			console.log('Security provider not loaded'.bold.red);
			singleWarining = false;
		}
	}

	impress.security.createDataStructures = function(callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.dropDataStructures = function(callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.emptyDataStructures = function(callback) {
		showWarning();
		if (callback) callback();
	}

	// User SignIn
	//   post request should contain "Login" and "Password" fields
	//   callback(isSuccess)
	//
	impress.security.signIn = function(client, callback) {
		impress.security.getUser(client, client.fields.Login, function(err, user) {
			if (user && (user.password == client.fields.Password)) {
				client.startSession();
				if (!client.application.users[user.userId]) client.application.users[user.userId] = user;
				client.application.sessions[client.session].userId = user.userId;
				client.application.sessions[client.session].login = user.login;
				if (user.group) client.application.sessions[client.session].group = user.group;
				client.application.sessions[client.session].sessionModified = true;
				client.logged = true;
				callback(true);
			} else callback(false);
		});
	}

	// User SignOut (session remains)
	//
	impress.security.signOut = function(client, callback) {
		if (client.session) {
			var sid = client.session,
				userId = client.application.sessions[sid].userIdб
				sessions = client.application.sessions;
			if (userId && client.application.users[userId] && client.application.users[userId].sessions) delete client.application.users[userId].sessions[sid];
			if (sessions[sid].userId) delete sessions[sid].userId;
			if (sessions[sid].login)  delete sessions[sid].login;
			if (sessions[sid].group)  delete sessions[sid].group;
			sessions[sid].sessionModified = true;
			client.logged = false;
			client.user = null;
			callback(true);
		} else callback(false);
	}

	impress.security.register = function(client, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.getUser = function(client, login, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.getUserById = function(client, userId, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.restorePersistentSession = function(client, sid, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.savePersistentSession = function(client, sid, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.deletePersistentSession = function(client, sid, callback) {
		showWarning();
		if (callback) callback();
	};

} (global.impress = global.impress || {}));