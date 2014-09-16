(function($) {

  function RemoteModel() {
    var PAGESIZE = 50;
    var data = {length: 0};
    var dataSource = '';
    var filter = {};
    var sortcol = null;
    var sortdir = 1;
    var h_request = null;
    var req = null; // ajax request

    // events
    var onDataLoading = new Slick.Event();
    var onDataLoaded = new Slick.Event();

    function init() {
    }

    function isDataLoaded(from, to) {
      for (var i = from; i <= to; i++) {
        if (data[i] == undefined || data[i] == null) return false;
      }
      return true;
    }

    function clear() {
      for (var key in data) delete data[key];
      data.length = 0;
    }

    function ensureData(from, to) {
      if (req) {
        req.abort();
        for (var i = req.fromPage; i <= req.toPage; i++) data[i * PAGESIZE] = undefined;
      }
      if (from < 0) from = 0;
      if (data.length > 0) to = Math.min(to, data.length - 1);

      var fromPage = Math.floor(from / PAGESIZE);
      var toPage = Math.floor(to / PAGESIZE);

      while (data[fromPage * PAGESIZE] !== undefined && fromPage < toPage) fromPage++;
      while (data[toPage * PAGESIZE] !== undefined && fromPage < toPage) toPage--;

      if (fromPage > toPage || ((fromPage == toPage) && data[fromPage * PAGESIZE] !== undefined)) {
        // TODO: look-ahead
        onDataLoaded.notify({from: from, to: to});
        return;
      }

      if (h_request != null) clearTimeout(h_request);

      h_request = setTimeout(function() {
        for (var i = fromPage; i <= toPage; i++) data[i * PAGESIZE] = null; // null indicates a 'requested but not available yet'
        onDataLoading.notify({from: from, to: to});

        req = $.post('/dbmi/grid/data.json', {
          source: dataSource,
          filter: JSON.stringify(filter),
          start: fromPage * PAGESIZE,
          limit: ((toPage - fromPage) * PAGESIZE) + PAGESIZE,
          sortby: sortcol ? sortcol : '*',
          order: (sortdir > 0) ? "asc" : "desc"
        }, onSuccess);

        req.fromPage = fromPage;
        req.toPage = toPage;
      }, 50);
    }

    function onSuccess(res) {
      logAdd(res.sql, "");
      var from = res.start, to = from + res.data.length;
      data.length = Math.min(parseInt(res.count, 10),1000);
      for (var i = 0; i < res.data.length; i++) {
        var item = res.data[i];
        data[from + i] = item;
        data[from + i].index = from + i;
      }
      req = null;
      onDataLoaded.notify({from: from, to: to});
    }

    function reloadData(from, to) {
      for (var i = from; i <= to; i++) delete data[i];
      ensureData(from, to);
    }

    function setSort(column, dir) {
      sortcol = column;
      sortdir = dir;
      clear();
    }

    function setFilter(f) {
      filter = f;
      clear();
    }

    function setSource(source) {
      dataSource = source;
      clear();
    }

    init();

    return {
      // properties
      "data": data,

      // methods
      "clear": clear,
      "isDataLoaded": isDataLoaded,
      "ensureData": ensureData,
      "reloadData": reloadData,
      "setSort": setSort,
      "setFilter": setFilter,
      "setSource": setSource,

      // events
      "onDataLoading": onDataLoading,
      "onDataLoaded": onDataLoaded
    };
  }

  // Slick.Data.RemoteModel
  $.extend(true, window, { Slick: { Data: { RemoteModel: RemoteModel }}});

})(jQuery);