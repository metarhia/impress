// WCL Web Component Library
// Version 0.0.6

(function(wcl) {

  wcl.dataSets = {};
  wcl.containers = {};
  wcl.components = {};
  wcl.utils = {};

  wcl.AjaxAPI = function(methods) { // params: { method: { get/post:url }, ... }
    var api = {};
    api.request = function(apiMethod, params, callback) {
      var err = null, requestParams = this.methods[apiMethod];
      if (requestParams) {
        var httpMethod, url;
        if (requestParams.get ) { httpMethod = 'GET';  url = requestParams.get;  }
        if (requestParams.post) { httpMethod = 'POST'; url = requestParams.post; }
        if (httpMethod) {
          wcl.request(httpMethod, url, params, true, callback);
          return;
        } else err = new Error("DataSource error: HTTP method is not specified");
      } else err = new Error("DataSource error: AJAX method is not specified");
      callback(err, null);
    }
    api.init = function(methods) {
      api.methods = methods;
      for (var method in api.methods) {
        (function() {
          var apiMethod = method;
          if (apiMethod == 'introspect') api[apiMethod] = function(params, callback) {
            api.request(apiMethod, params, function(err, data) {
              api.init(data);
              callback(err, data);
            });
          }; else api[apiMethod] = function(params, callback) {
            api.request(apiMethod, params, callback);
          }
        } ());
      }
    }
    api.init(methods);
    return api;
  }

  wcl.DataSource = function(methods) {
    // just abstract, see implementation below
    // should be implemented methods:
    //   read(query, callback)   return one record as object, callback(err, obj)
    //   insert(obj, callback)   insert one record, callback(err) on done
    //   update(obj, callback)   update one record, callback(err) on done
    //   delete(query, callback) delete multiple records, callback(err) on done
    // may be implemented methods:
    //   introspect(params, callback) populates DataSource.methods with introspection metadata returning from server
    //   metadata(params, callback)   populates DataSource.metadata with metadata from server
    //   find(query, callback)        return multiple records as Array, callback(err, Array)
  }

  wcl.AjaxDataSource = function(methods) {
    var ds = wcl.AjaxAPI(methods);
    ds.read = function(query, callback) {
      ds.request('read', query, function(err, data) {
        // TODO: autocreate Record
        //   callback(err, wcl.Record({ data:data }));
        //
        callback(err, data);
      });
    }
    return ds;
  }

  wcl.MemoryDataSource = function(params) { // { data:Hash, metadata:Hash }
    var ds = {};
    ds.data = params.data;
    ds.metadata = params.metadata;
    ds.each = function(params, callback) {
      for (var i = 0; i < ds.data.length; i++) {
        var d = ds.data[i], match = true;
        for (var key in params) match = match && (d[key] == params[key]);
        if (match) { if (callback(i)) return; }
      }
    }
    ds.read = function(params, callback) {
      var data = ds.data;
      ds.each(params, function(key) { callback(null, data[key]); return true; });
      callback(new Error("Record not found"), null);
    }
    ds.insert = function(params, callback) {
      ds.data.push(params);
      callback();
    }
    ds.update = function(params, callback) {
      var data = ds.data;
      ds.each(params, function(key) { data[key] = params; return true; });
      callback();
    }
    ds.delete = function(params, callback) {
      var data = ds.data;
      ds.each(params, function(key) { delete data[key]; });
      callback();
    }
    ds.find = function(params, callback) {
      var data = ds.data, result = [];
      ds.each(params, function(key) { result.push(data[key]); });
      callback(null, result);
    }
    return ds;
  }
  
  wcl.DataObject = function(params) {
    // params: { data:Value, metadata:Hash, record:Record }
    //
    var obj = {};
    obj.data = params.data;
    obj.fields = {};
    obj.type = typeof(obj.data); // Object, String, Array, Number
    obj.bindings = [];
    obj.modified = false;

    if (obj.data != null && typeof(obj.data) == "object") {
      for (var key in obj.data) obj.fields[key] = wcl.DataObject({ data:obj.data[key] });
    }

    obj.value = function(value, forceUpdate) {
      if (value != undefined) {
        if ((field.data != value) || forceUpdate) {
          //console.log('Field change '+field.data+' to '+value);
          field.data = value;
          if (!forceUpdate) {
            field.modified = true;
            field.dataSet.record.modified = true;
          }
          if (field.dataSet.updateCount == 0) {
            for (var i = 0; i < field.bindings.length; i++) field.bindings[i].value(value);
          }
        }
      } else return field.data;
    }
    return obj;
  }
  
  wcl.Record = function(params) {
    // implemented params: { data:Hash, metadata:Hash, dataSet:DataSet }
    // not implemented:    { table:Table, source:DataSource }
    //
    var record = {};
    record.fields = {};
    record.dataSet = params.dataSet;
    record.modified = false;
    record.assign = function(data, metadata, preventUpdateAll) {
      for (var fieldName in data) {
        if (record.fields[fieldName]) {
          record.fields[fieldName].value(data[fieldName]);
          record.fields[fieldName].modified = false;
        } else record.fields[fieldName] = wcl.Field({
          data:     data[fieldName],
          metadata: metadata ? metadata[fieldName] : null,
          dataSet:  record.dataSet
        });
      }
      if (!preventUpdateAll) record.updateAll();
      record.modified = false;
    }
    record.each = function(callback) { // callback(fieldName, field)
      for (var fieldName in record.fields) callback(fieldName, record.fields[fieldName]);
    }
    record.toObject = function() {
      var result = {};
      record.each(function(fieldName, field) { result[fieldName] = field.value(); });
      return result;
    }
    record.toString = function() {
      return JSON.stringify(record.toObject());
    }
    record.deltaObject = function() {
      var result = {};
      record.each(function(fieldName, field) {
        if (field.modified) result[fieldName] = field.value();
      });
      return result;
    }
    record.deltaString = function() {
      return JSON.stringify(record.deltaObject());
    }
    record.commit = function() {
      if (record.modified) {
        var recNo = record.dataSet.currentRecord,
          data = record.dataSet.memory.data[recNo];
        record.each(function(fieldName, field) {
          if (field.modified) data[fieldName] = field.value();
          field.modified = false;
        });
        record.modified = false;
      }
    }
    record.rollback = function() {
      if (record.modified) {
        var recNo = record.dataSet.currentRecord,
          data = record.dataSet.memory.data[recNo];
        record.assign(data);
      }
    }
    record.updateAll = function() {
      record.each(function(fieldName, field) { field.value(field.data, true); });
    }
    if (params.data) record.assign(params.data, params.metadata, true);
    return record;
  }

  wcl.DataSet = function(params) {
    // implemented params: { data:Hash, metadata:Hash }
    // not implemented:    { source:DataSource }
    //
    var dataSet = {};
    dataSet.memory = wcl.MemoryDataSource({ data:[] });
    dataSet.metadata = params.metadata;
    dataSet.source = params.source;
    dataSet.record = null;
    dataSet.recordCount = 0;
    dataSet.currentRecord = -1;
    dataSet.modified = false;
    dataSet.query = function(params, callback) {
      dataSet.source.find(params, function(err, data) {
        dataSet.assign(data);
        callback();
      });
    }
    dataSet.toString = function() {
      return JSON.stringify(dataSet.memory.data);
    }
    dataSet.assign = function(data) {
      if (data) {
        dataSet.memory.data = data;
        dataSet.recordCount = dataSet.memory.data.length;
        dataSet.currentRecord = -1;
        dataSet.first();
      }
    }
    dataSet.move = function(recNo) {
      if (recNo != dataSet.currentRecord && recNo >= 0 && recNo < dataSet.recordCount) {
        var data = dataSet.memory.data[recNo];
        if (dataSet.record) {
          if (dataSet.record.modified) dataSet.record.commit();
          dataSet.record.assign(data);
        } else dataSet.record = wcl.Record({ data:data, dataSet:dataSet });
        dataSet.currentRecord = recNo;
      }
    }
    dataSet.first = function() { dataSet.move(0); }
    dataSet.next  = function() { dataSet.move(dataSet.currentRecord+1); }
    dataSet.prev  = function() { dataSet.move(dataSet.currentRecord-1); }
    dataSet.last  = function() { dataSet.move(dataSet.recordCount-1); }
    //
    dataSet.updateCount = 0;
    dataSet.beginUpdate = function() {
      dataSet.updateCount++;
    }
    dataSet.endUpdate = function() {
      dataSet.updateCount--;
      if (dataSet.updateCount <= 0) {
        dataSet.updateCount = 0;
        dataSet.updateAll();
      }
    }
    dataSet.updateAll = function() {
      dataSet.record.updateAll();
    }
    dataSet.commit = function() {

    }
    dataSet.rollback = function() {

    }

    dataSet.assign(params.data);
    return dataSet;
  }

  // Nonvisual or visual component
  //
  wcl.components.Component = function(obj) {
  }

  // Visual component
  wcl.components.Control = function(obj) {
    wcl.components.Component(obj);
    //
  }

  wcl.components.Iterator = function(obj) {
    wcl.components.Control(obj);
    //
  }

  wcl.components.Container = function(obj) {
    wcl.components.Control(obj);
    obj.wcl.controls = {};
    if (obj.wcl.dataWcl.dataSet) obj.wcl.dataSet = global[obj.wcl.dataWcl.dataSet];
  }
  
  wcl.components.FieldControl = function(obj) {
    wcl.components.Control(obj);
    // obj.wcl.dataSet - autoassigned on load
    obj.wcl.field = obj.wcl.dataSet.record.fields[obj.wcl.dataWcl.field];
    obj.wcl.field.bindings.push(obj);
  }

  wcl.components.Label = function(obj) {
    wcl.components.FieldControl(obj);
    obj.innerHTML = '<span>'+obj.wcl.field.data+'</span>';
    obj.value = function(value) {
      if (value == undefined) return obj.textContent;
      else if (obj.textContent != value) obj.textContent = value;
    }
  }
  
  wcl.components.Edit = function(obj) {
    wcl.components.FieldControl(obj);
    obj.innerHTML = '<input type="text" name="email">';
    var edit = obj.children[0];
    edit.value = obj.wcl.field.data;
    edit.addEventListener('keyup', function(e) {
      obj.wcl.field.value(this.value);
    }, false);
    obj.value = function(value) {
      var edit = this.children[0];
      if (value == undefined) return edit.value;
      else if (edit.value != value) edit.value = value;
    }
  }

  wcl.components.Button = function(obj) {
    wcl.components.Control(obj);
    obj.innerHTML = '<a href="" onclick=""></a>';
    var edit = obj.children[0];
    edit.value = obj.wcl.field.data;
    edit.addEventListener('click', function(e) {
      console.log('button clicked');
    }, false);
  }

  wcl.components.Table = function(obj) {
    wcl.components.Control(obj);
    //
  }

  // TODO: autobind on load
  //
  wcl.bind = function(params) { // { record:Record, container:element }
    params.container.wcl = { record: params.record };
    var elements = params.container.getElementsByTagName('div');
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i],
        dataWcl = element.getAttribute('data-wcl');
      if (dataWcl) {
        element.wcl = { dataWcl: wcl.parse(dataWcl), record: params.record };
        if (element.wcl.dataWcl.control) {
          var component = wcl.components[element.wcl.dataWcl.control];
          global[element.wcl.dataWcl.name] = element;
          component(element);
        }
      }
    }
  }

  wcl.parse = function(json) {
    var result;
    eval('result = new Object('+json+')');
    return result;
  }

  wcl.htmlEscape = function(content) {
    return content.replace(/[&<>"'\/]/g, function(char) { return (
      { "&":"&amp;","<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]
    )});
  }

  wcl.template = function(tpl, data, escapeHtml) {
    return tpl.replace(/@([\-\.0-9a-zA-Z]+)@/g, function(s, key) {
      return escapeHtml ? wcl.htmlEscape(data[key]) : data[key];
    });
  }

  wcl.templateHtml = function(tpl, data) {
    return wcl.template(tpl, data, true);
  }

  wcl.request = function(method, url, params, parseResponse, callback) {
    var req = new XMLHttpRequest(), data = [], value = '';
    req.open(method, url, true);
    for (var key in params) {
      if (!params.hasOwnProperty(key)) continue;
      value = params[key];
      if (typeof(value) != 'string') value = JSON.stringify(value);
      data.push(encodeURIComponent(key)+'='+encodeURIComponent(value));
    }
    data = data.join('&');
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("Content-length", data.length);
    req.setRequestHeader("Connection", "close");
    req.onreadystatechange = function() {
      if (req.readyState == 4) {
        var err = null, res = req.responseText;
        if (req.status == 0 || req.status == 200) {
          if (parseResponse) {
            try { res = JSON.parse(res); }
            catch(e) { err = new Error("JSON parse code: "+e); }
          }
        } else err = new Error("HTTP error code: "+req.status);
        callback(err, res);
      }
    }
    try { req.send(data); }
    catch(e) { }
  }

  wcl.get = function(url, params, callback) {
    wcl.request("GET", url, params, true, callback);
  }

  wcl.post = function(url, params, callback) {
    wcl.request("POST", url, params, true, callback);
  }

  wcl.autoInitialization = function() {
    wcl.body = document.body || document.getElementsByTagName('body')[0];
    var elements = wcl.body.getElementsByTagName('div');
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i],
        dataWcl = element.getAttribute('data-wcl');
      if (dataWcl) {
        element.wcl = { dataWcl: wcl.parse(dataWcl) }; // record: params.record
        if (element.wcl.dataWcl.control == 'Container') wcl.containers[dataWcl.name] = element;
      }
    }
    for (var containerName in wcl.containers) {
      var container = wcl.containers[containerName],
        elements = container.getElementsByTagName('div');
      global[container.wcl.dataWcl.name] = container;
      wcl.components.Container(container);
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        if (element.wcl.dataWcl.control) {
          var component = wcl.components[element.wcl.dataWcl.control];
          container.wcl.controls[element.wcl.dataWcl.name] = element;
          container[element.wcl.dataWcl.name] = element;
          element.wcl.container = container;
          element.wcl.dataSet = container.wcl.dataSet;
          component(element);
        }
      }
    }

  }

  //addEvent(global, 'load', wcl.autoInitialization);

} (global.wcl = global.wcl || {}));