(function(impress) {

	// TODO: test security against v0.1.1

	impress.security = {};

	impress.users = []; // authenticated users indexed by userId
	impress.sessions = []; // sessions indexed by SID

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
	impress.security.getSessionUser = function(sid) {
		var userId = impress.sessions[sid].userId;
		return userId ? impress.users[userId] : {};
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
		impress.security.getUser(client.fields.Login, function(err, user) {
			if (user && (user.password == client.fields.Password)) {
				client.startSession();
				if (!impress.users[user.userId]) impress.users[user.userId] = user;
				impress.sessions[client.session].userId = user.userId;
				impress.sessions[client.session].login = user.login;
				if (user.group) impress.sessions[client.session].group = user.group;
				impress.sessions[client.session].sessionModified = true;
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
				userId = impress.sessions[sid].userId;
			if (userId && impress.users[userId] && impress.users[userId].sessions) delete impress.users[userId].sessions[sid];
			if (impress.sessions[sid].userId) delete impress.sessions[sid].userId;
			if (impress.sessions[sid].login)  delete impress.sessions[sid].login;
			if (impress.sessions[sid].group)  delete impress.sessions[sid].group;
			impress.sessions[sid].sessionModified = true;
			client.logged = false;
			client.user = null;
			callback(true);
		} else callback(false);
	}

	impress.security.register = function(client, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.getUser = function(login, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.getUserById = function(userId, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.restorePersistentSession = function(sid, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.savePersistentSession = function(sid, callback) {
		showWarning();
		if (callback) callback();
	}

	impress.security.deletePersistentSession = function(sid, callback) {
		showWarning();
		if (callback) callback();
	};

} (global.impress = global.impress || {}));