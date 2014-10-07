module.exports = {

  caption: 'Impress System Core Database Schema',
  version: 9,

  SystemLanguage: {
    caption: 'Language',
    type: 'system',
    fields: {
      LanguageId:   { caption: 'Id',            type: 'id' },
      LanguageName: { caption: 'Language Name', type: 'str',  size: 32, nullable: false, index: { unique: true } },
      Sign:         { caption: 'Sign',          type: 'char', size: 2,  nullable: false, index: { unique: true } },
      ISO:          { caption: 'ISO Code',      type: 'char', size: 2,  nullable: false, index: { unique: true } },
      Caption:      { caption: 'Caption',       type: 'str',  size: 32, nullable: false, index: { unique: true } }
    }
  },

  SystemServer: {
    caption: 'System Servers',
    type: 'system',
    fields: {
      ServerId:   { caption: 'Id',          type: 'id' },
      ParentId:   { caption: 'Parent',      type: 'tree' },
      IpAddress:  { caption: 'IP Address',  type: 'ip',            nullable: false, index: { unique: true } },
      DomainName: { caption: 'Domain Name', type: 'str', size: 64, nullable: false, index: { unique: true } }
    }
  },

  SystemUnique: {
    caption: 'System Unique Identifiers',
    type: 'system',
    fields: {
      UniqueId:     { caption: 'Id',          type: 'id' },
      ParentId:     { caption: 'Parent',      type: 'tree' },
      ServerId:     { caption: 'Server',      type: 'id', nullable: false, link: { dataset: 'SystemServer' } },
      Identifier:   { caption: 'Identifier',  type: 'str',  size: 64,      index:  { unique: true } },
      Status:       { caption: 'Status',      type: 'char', size: 1,       lookup: { dictionary: {
        'R': 'Registering', 'B': 'Blocked', 'S': 'Stub', 'M': 'Moved', 'A': 'Active', 'P': 'Passive'
      } } },
      CreationDate: { caption: 'Creation',    type: 'datetime', nullable: false, index: { unique: false } }
    }
  },

  SystemUser: {
    caption: 'System Users',
    fields: {
      UserId:   { caption: 'Id',        type: 'uid' },
      Login:    { caption: 'Login',     type: 'str', size: 64, nullable: false, index: { unique: true } },
      Password: { caption: 'Password',  type: 'str', size: 64, nullable: false },
      FullName: { caption: 'Full Name', type: 'str', size: 255 }
    }
  },

  SystemGroup: {
    caption: 'System Groups',
    fields: {
      GroupId:   { caption: 'Id',   type: 'uid' },
      GroupName: { caption: 'Name', type: 'str', size: 64, nullable: false, index: { unique: true } }
    }
  },

  SystemGroupUser: {
    caption: 'System Group Users',
    type: 'crossreference',
    fields: {
      GroupId: { caption: 'Group', type: 'uid', master: { dataset: 'SystemGroup' }, primary: true },
      UserId:  { caption: 'User',  type: 'uid', master: { dataset: 'SystemUser'  }, primary: true }
    }
  },

  SystemPermission: {
    caption: 'System Permission',
    fields: {
      PermissionId:   { caption: 'Id',     type: 'uid' },
      ParentId:       { caption: 'Parent', type: 'tree' },
      PermissionName: { caption: 'Name',   type: 'str', size: 64, nullable: false, index: { unique: true } }
    }
  },
  
  SystemGroupPermission: {
    caption: 'System Group Permission',
    fields: {
      GroupId: { caption: 'Group', type: 'uid', master: { dataset: 'SystemGroup' }, primary: true },
      PermissionId:  { caption: 'Permission',  type: 'uid', master: { dataset: 'SystemPermission' }, primary: true }
    }
  },

  SystemUserPermission: {
    caption: 'System User Permission',
    fields: {
      UserId: { caption: 'User', type: 'uid', master: { dataset: 'SystemUser' }, primary: true },
      PermissionId:  { caption: 'Permission',  type: 'uid', master: { dataset: 'SystemPermission' }, primary: true }
    }
  },
  
  SystemLog: {
    caption: 'System Log',
    fields: {
      LogId:     { caption: 'Id',      type: 'id' },
      ServerId:  { caption: 'Server',  type: 'id', master: { dataset: 'SystemServer', key: 'ServerId' } },
      EventTime: { caption: 'Time',    type: 'datetime', nullable: false, index: { unique: false } },
      Status:    { caption: 'Status',  type: 'char', size: 1, lookup: { dictionary: {
        'E': 'Exception', 'D': 'Database', 'N': 'Network', 'F': 'Filesystem', 'M': 'Memory', 'A': 'Access', 'I': 'Info', 'G': 'Debug'
      } } },
      EventType: { caption: 'Type',    type: 'str', size: 32, index: { unique: false } },
      Message:   { caption: 'Message', type: 'str', size: 128 },
      EventData: { caption: 'Data',    type: 'text' }
    }
  }

};
