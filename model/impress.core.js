module.exports = {

  caption: "Impress System Core Database Schema",
  version: 10,

  User: {
    caption: "System Users",
    fields: {
      UserId:   { caption: "Id",        type: "uid" },
      Login:    { caption: "Login",     type: "str", size: 64, nullable: false, index: { unique: true } },
      Password: { caption: "Password",  type: "str", size: 64, nullable: false },
      FullName: { caption: "Full Name", type: "str", size: 255 }
    }
  },

  Group: {
    caption: "System Groups",
    fields: {
      GroupId:   { caption: "Id",   type: "uid" },
      GroupName: { caption: "Name", type: "str", size: 64, nullable: false, index: { unique: true } }
    }
  }

}