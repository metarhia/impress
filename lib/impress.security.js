(function(impress) {

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
	impress.security.signIn = function(req, res, callback) {
		impress.security.getUser(req.post.Login, function(err, user) {
			if (user && (user.password == req.post.Password)) {
				impress.startSession(req, res);
				if (!impress.users[user.userId]) impress.users[user.userId] = user;
				impress.sessions[req.impress.session].userId = user.userId;
				req.impress.sessionModified = true;
				req.impress.logged = true;
				callback(true);
			} else callback(false);
		});
	}

	// User SignOut (session remains)
	//
	impress.security.signOut = function(req, res, callback) {
		if (req.impress.session) {
			var sid = req.impress.session,
				userId = impress.sessions[sid].userId;
			if (userId && impress.users[userId] && impress.users[userId].sessions) delete impress.users[userId].sessions[sid];
			delete impress.sessions[sid].userId;
			impress.sessions[sid].sessionModified = true;
			req.impress.logged = false;
			req.impress.user = null;
			callback(true);
		} else callback(false);
	}

	impress.security.register = function(req, res, callback) {
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