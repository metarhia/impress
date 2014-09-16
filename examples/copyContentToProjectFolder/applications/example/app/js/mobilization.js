(function($) {

$.platform = {
  iPhone: navigator.userAgent.match(/iPhone/i),
  iPod: navigator.userAgent.match(/iPod/i),
  iPad: navigator.userAgent.match(/iPad/i),
  Android: navigator.userAgent.match(/Android/i)
}

$.platform.iOS = $.platform.iPhone || $.platform.iPod || $.platform.iPad;
$.platform.Mobile = $.platform.iOS || $.platform.Android;

$.extend({

  fixLinks: function(persist) {
    if ($.platform.iOS) {
      if (persist == null) persist = true;
      persist = persist && localStorage;
      if (persist) {
        var CurrentLocation = window.location.pathname+window.location.search,
          StoredLocation = localStorage.getItem("location");
        if (StoredLocation && StoredLocation!=CurrentLocation) window.location = StoredLocation;
      }
      $('a').live('click',function(e) {
        e.preventDefault();
        if (persist && this.host==window.location.host)
        localStorage.setItem("location",this.pathname+this.search);
        window.location = this.href;
      });
    }
  },

  fixCookie: function(SessionCookieName) {
    if (localStorage && $.platform.iOS) {
      var CookieSession = document.cookie.match(new RegExp(SessionCookieName+"=[^;]+")),
        LocalSession = localStorage.getItem(SessionCookieName);
      if (CookieSession) {
        CookieSession = CookieSession[0].replace(SessionCookieName+"=","");
        if (LocalSession!=CookieSession) localStorage.setItem(SessionCookieName,CookieSession);
      } else if (LocalSession && LocalSession!=CookieSession) {
        document.cookie = SessionCookieName+"="+LocalSession+"; path=/";
        window.location.reload(true);
      }
    }
  }

});

})( jQuery );