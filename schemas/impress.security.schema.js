module.exports = {

  caption: 'Impress security database schema for MongoDB',
  version: 1,

  users: {
    caption: 'System Users',
    fields: {
      _id:      { caption: 'Id',        type: 'id' },
      login:    { caption: 'Login',     type: 'str', size: 64, nullable: false, index: { unique: true } },
      password: { caption: 'Password',  type: 'str', size: 64, nullable: false },
      group:    { caption: 'Group',     type: 'str', size: 64 }
    },
    data: [ { login: 'admin', password: 'cartesius', group: 'admins' } ]
  },

  groups: {
    caption: 'System Groups',
    fields: {
      _id:      { caption: 'Id',        type: 'id' },
      name:     { caption: 'Name', type: 'str', size: 64, nullable: false, index: { unique: true } }
    },
    data: [ { name: 'users' }, { name: 'admins' }, { name: 'employees' } ]
  },

  sessions: {
    caption: 'Sessions',
    fields: {
      _id:      { caption: 'Id',        type: 'id' },
      login:    { caption: 'Login',     type: 'str', size: 64, nullable: false },
      sid:      { caption: 'Password',  type: 'str', size: 64, nullable: false, index: { unique: true } },
      group:    { caption: 'Group',     type: 'str', size: 64 }
    }
  }

};
