global.onLoad(function() {

  taCommands = $("#taCommands");
  gridToolbar = $("#gridToolbar");
  logTable = $("#logTable");
  logScroll = logTable.parent()[0];
  var grid, loader, gridSource;
  
  global.logAdd = function(command, status) {
    if (command) {
      status = status || '';
      logTable.append("<tr><td>"+command+"</td><td>"+status+"</td></tr>");
      logScroll.scrollTop = logScroll.scrollHeight;
    }
  }

  var metadata = {
    plugins: [
      "themes","json_data","ui","crrm",/*"cookies",*/"dnd","search","types","hotkeys","contextmenu" 
    ],
    json_data: {
      ajax: {
        url: "/dbmi/tree/data.json",
        // the `data` function is executed in the instance's scope
        // the parameter is the node being loaded 
        // (may be -1, 0, or undefined when loading the root nodes)
        data: function(n) {
          setTimeout(function() { panelLeft.resize(); }, 2000);
          // the result is fed to the AJAX request `data` option
          return { id: n.attr ? n.attr("id") : 1 };
        }
      }
    },
    search: {
      // As this has been a common question - async search
      // Same as above - the `ajax` config option is actually jQuery's AJAX object
      ajax: {
        url: "/dbmi/tree/search.json",
        data: function(str) { // You get the search string as a parameter
          return { search_str: str };
        }
      }
    },
    types: {
      // I set both options to -2, as I do not need depth and children count checking
      // Those two checks may slow jstree a lot, so use only when needed
      max_depth: -2,
      max_children: -2,
      // I want only `drive` nodes to be root nodes 
      // This will prevent moving or creating any other type as a root node
      valid_children: [ "root" ],
      types: {
        default: {
          // valid_children: "none",
          valid_children: [ "default", "provider", "database", "collection", "disk", "folder", "file", "table", "view" ],
          icon: {
            image: "/js/jstree/images/folder.png"
          },
          select_node: function(e) {
            var element = e[0];
            if (element) {
              displayData(element.id);
            }
            this.toggle_node(e);
            return true;
          }
        },
        folder: {
          valid_children: "none",
          icon: {
            image: "/js/jstree/images/folder.png"
          },
        },
        provider: {
          valid_children: [ "database" ],
          icon: {
            image: "/js/jstree/images/provider.png"
          },
        },
        database: {
          valid_children: [ "table", "view", "collection" ],
          icon: {
            image: "/js/jstree/images/database.png"
          },
        },
        collection: {
          valid_children: "none",
          icon: {
            image: "/js/jstree/images/collection.png"
          },
        },
        table: {
          valid_children: "none",
          icon: {
            image: "/js/jstree/images/table.png"
          },
        },
        view: {
          valid_children: "none",
          icon: {
            image: "/js/jstree/images/view.png"
          },
        },
        folder: {
          valid_children: "none",
          icon: {
            image: "/js/jstree/images/folder.png"
          },
        },
        root: {
          valid_children: [ "default", "provider", "database" ],
          icon: {
            image: "/js/jstree/images/provider.png"
          },
          start_drag:  false,
          move_node:   false,
          delete_node: false,
          remove:      false
        }
      }
    },
    ui: {
      // "initially_select" : [ "root" ]
    },
    core: { 
      // "initially_open" : [ "objects" ] 
    },
    contextmenu: {
      items: customMenu
    }
  };

  initTree();

  function initTree() {
    $("#dbmiTree")
    .bind("before.jstree", function(e, data) {
      $("#alog").append(data.func + "<br />");
    })
    .jstree(metadata)
    .bind("create.jstree", function(e, data) {
      $.post("/dbmi/tree/create.json", {
        id:       data.rslt.parent.attr("id"),
        position: data.rslt.position,
        title:    data.rslt.name,
        type:     data.rslt.obj.attr("rel")
      }, function(res) {
        if (res.status) $(data.rslt.obj).attr("id", res.id);
        else $.jstree.rollback(data.rlbk);
      });
    })
    .bind("remove.jstree", function(e, data) {
      data.rslt.obj.each(function() {
        var id = this.id;
        confirmation('Delete','Do you wont to delete "'+this.id+'" ?', function() {
          $.ajax({
            async: false,
            type:  'POST',
            url:   "/dbmi/tree/delete.json",
            data:  { id: id },
            success: function(res) {
              if (!res.status) data.inst.refresh();
            }
          });
        });
      });
    })
    .bind("rename.jstree", function(e, data) {
      $.post("/dbmi/tree/rename.json", {
        id:    data.rslt.obj.attr("id"),
        title: data.rslt.new_name
      }, function(res) {
        if (!res.status) $.jstree.rollback(data.rlbk);
      });
    })
    .bind("move_node.jstree", function(e, data) {
      data.rslt.o.each(function(i) {
        $.ajax({
          async: false,
          type:  'POST',
          url:   "/dbmi/tree/move.json",
          data:  {
            id:       $(this).attr("id"),
            ref:      data.rslt.cr === -1 ? 1 : data.rslt.np.attr("id"),
            position: data.rslt.cp + i,
            title:    data.rslt.name,
            copy:     data.rslt.cy ? 1 : 0
          },
          success: function(res) {
            if (!res.status) {
              $.jstree.rollback(data.rlbk);
            } else {
              $(data.rslt.oc).attr("id", res.id);
              if (data.rslt.cy && $(data.rslt.oc).children("UL").length) {
                data.inst.refresh(data.inst._get_parent(data.rslt.oc));
              }
            }
          }
        });
      });
    })
    .bind("loaded.jstree", function(event, data) {
      $("#dbmiTree").jstree('select_node', 'ul > li:first');
    });
  }

  function customMenu(node) {
    var items = {
      "cdatabase" : {
        "separator_before"  : false,
        "separator_after"  : false,
        "label"        : "Create database",
        "action"      : function(obj) { this.create(obj, "last", { "attr": { "rel": "database" } }); },
        "icon"        : "/js/jstree/images/database.png"
      },
      "ccollection" : {
        "separator_before"  : false,
        "separator_after"  : false,
        "label"        : "Create collection",
        "action"      : function(obj) { this.create(obj, "last", { "attr": { "rel": "collection" } }); },
        "icon"        : "/js/jstree/images/collection.png"
      },
      "ctable" : {
        "separator_before"  : false,
        "separator_after"  : false,
        "label"        : "Create table",
        "action"      : function(obj) { this.create(obj, "last", { "attr": { "rel": "table" } }); },
        "icon"        : "/js/jstree/images/table.png"
      },
      "rename" : {
        "separator_before"  : false,
        "separator_after"  : false,
        "label"        : "Rename",
        "action"      : function(obj) { this.rename(obj); },
        "icon"        : "/js/jstree/images/rename.png"
      },
      "remove" : {
        "separator_before"  : false,
        "icon"        : false,
        "separator_after"  : false,
        "label"        : "Delete",
        "action"      : function(obj) { if (this.is_selected(obj)) this.remove(); else this.remove(obj); },
        "icon"        : "/js/jstree/images/remove.png"
      },
      "backup" : {
        "separator_before"  : false,
        "icon"        : false,
        "separator_after"  : false,
        "label"        : "Backup",
        "action"      : function(obj) { if (this.is_selected(obj)) backup(obj); },
        "icon"        : "/js/jstree/images/download.png"
      }
    };
    var nodeType = this._get_type(node),
      metaType = metadata.types.types[nodeType];
    if (nodeType == "provider") {
      delete items.ccollection;
      delete items.ctable;
      delete items.rename;
      delete items.remove;
      delete items.backup;
    } else if (nodeType == "database") {
      delete items.cdatabase;
    } else if (nodeType == "collection") {
      delete items.cdatabase;
      delete items.ccollection;
      delete items.ctable;
    } else if (nodeType == "table") {
      delete items.cdatabase;
      delete items.ccollection;
      delete items.ctable;
    }
    return items;
  };

  function displayData(source) {
    gridToolbar.hide();
    if (source) {
      gridSource = source;
      var surrcePath = source.split('/');
      if (surrcePath.length-1!=3) return;
      
      panelCenter.css({padding:'0px'}).html('<div id="myGrid" style="width:100%;height:100%;"></div>');
      
      //  '<div id="commandLine"><textarea style="height:100%; width:100%"></textarea></div>'

      $.get('/dbmi/grid/columns.json?source='+source, function(res) {
        loader = new Slick.Data.RemoteModel();
        gridSource = source;
        gridToolbar.show();
        var columns = res,
          columnFilters = {},
          options = {
            editable: true,
            enableAddRow: true,
            enableCellNavigation: true,
            syncColumnCellResize: true,
            showHeaderRow: true,
            headerRowHeight: 23,
            explicitInitialization: true,
            autoEdit:false
          },
          loadingIndicator = null;
        loader.setFilter({});
        loader.setSource(source);

        for (var i = 0; i <= columns.length-1; i++) {
          columns[i].editor = Slick.Editors.Text;
        }

        $(function() {
          grid = new Slick.Grid("#myGrid", loader.data, columns, options);

          /*loader.data.onRowCountChanged.subscribe(function(e, args) {
            grid.updateRowCount();
            grid.render();
          });

          loader.data.onRowsChanged.subscribe(function(e, args) {
            grid.invalidateRows(args.rows);
            grid.render();
          });*/

          $(grid.getHeaderRow()).delegate(":input", "change keyup", function(e) {
            var columnId = $(this).data("columnId");
            if (columnId != null) {
              var val = $.trim($(this).val());
              if (val) columnFilters[columnId] = val
              else delete columnFilters[columnId];
            }
            loader.setFilter(columnFilters);
            var vp = grid.getViewport();
            loader.ensureData(vp.top, vp.bottom);
          });

          grid.onHeaderRowCellRendered.subscribe(function(e, args) {
            $(args.node).empty();
            $("<input type='text'>")
              .data("columnId", args.column.id)
              .val(columnFilters[args.column.id])
              .appendTo(args.node);
          });

          grid.setColumns(columns);

          grid.onViewportChanged.subscribe(function(e, args) {
            var vp = grid.getViewport();
            loader.ensureData(vp.top, vp.bottom);
          });

          grid.onSort.subscribe(function(e, args) {
            loader.setSort(args.sortCol.field, args.sortAsc ? 1 : -1);
            var vp = grid.getViewport();
            loader.ensureData(vp.top, vp.bottom);
          });
                    
          grid.onCellChange.subscribe(function(e, args) {
            var fieldName = grid.getColumns()[args.cell].field,
              fieldValue = args.item[fieldName],
              primaryKey, pkValue;
            if (grid.getColumns()['_id'])
              primaryKey = grid.getColumns()['_id'].field;
            else
              primaryKey = grid.getColumns()[0].field;
            pkValue = args.item[primaryKey];
            if (pkValue) {
              var row = {};
              row[primaryKey] = pkValue;
              row[fieldName] = fieldValue;
              saveGridRow(row);
            } else {
              row = args.item;
              insertGridRow(row);
            }
          });
          
          function saveGridRow(row) {
            $.post("/dbmi/grid/save.json", { source: source, data: JSON.stringify(row) }, function(res) {
              //taCommands.val(res.sql);
              logAdd(res.sql, '');
              //if (res.status) $(data.rslt.obj).attr("id", res.id);
              //else $.jstree.rollback(data.rlbk);
            });
          }
          
          grid.onAddNewRow.subscribe(function(e, args) {
            var row = args.item;
            grid.invalidateRow(loader.data.length);
            row.index = loader.data.length;
            loader.data[loader.data.length] = row;
            loader.data.length++;
            grid.updateRowCount();
            grid.render();
            insertGridRow(row);
          });
          
          function insertGridRow(row) {
            var currentRow = row.index;
            $.post("/dbmi/grid/insert.json", { source: source, data: JSON.stringify(row) }, function(res) {
              if (res.data) {
                res.data.index = currentRow;
                loader.data[currentRow] = res.data;
                grid.invalidateRow(currentRow);
                grid.render();
              } else {
                delete loader.data[currentRow];
                var rowIndex = currentRow;
                loader.data.length--;
                while (rowIndex<loader.data.length) {
                  var row = loader.data[rowIndex+1];
                  row.index = rowIndex;
                  loader.data[rowIndex] = row;
                  grid.invalidateRow(rowIndex);
                  rowIndex++;
                }
                delete loader.data[rowIndex];
                grid.invalidateRow(rowIndex);
                grid.updateRowCount();
                grid.render();
                grid.scrollRowIntoView(currentRow-1);

              }
              logAdd(res.sql, '');
            });
          }

          loader.onDataLoading.subscribe(function() {
            if (!loadingIndicator) {
              loadingIndicator = $("<span class='loading-indicator'><label>Buffering...</label></span>").appendTo(document.body);
              var $g = $("#myGrid");
              loadingIndicator
                .css("position", "absolute")
                .css("top", $g.position().top + $g.height() / 2 - loadingIndicator.height() / 2)
                .css("left", $g.position().left + $g.width() / 2 - loadingIndicator.width() / 2);
            }
            loadingIndicator.show();
          });

          loader.onDataLoaded.subscribe(function(e, args) {
            for (var i = args.from; i <= args.to; i++) grid.invalidateRow(i);
            grid.updateRowCount();
            grid.render();
            loadingIndicator.fadeOut();
          });

          //loader.setSort("create_ts", -1);
          //grid.setSortColumn("date", false);

          // load the first page
          grid.onViewportChanged.notify();
          grid.init();
          
        });
      });
    }
  };
  
  $(document).on('click', "#gridEdit", function(event) {
  });
  
  $(document).on('click', "#gridInsert", function(event) {
  });
  
  $(document).on('click', "#gridClone", function(event) {
  });
  
  $(document).on('click', "#gridDelete", function(event) {
    var currentRow = grid.getActiveCell().row;
    if (loader.data[currentRow]) {
      if (grid.getColumns()['_id'])
        primaryKey = grid.getColumns()['_id'].field;
      else
        primaryKey = grid.getColumns()[0].field;
      var pkValue = loader.data[currentRow][primaryKey];
      confirmation('Delete','Do you wont to delete record ?', function() {
        $.post("/dbmi/grid/delete.json", { source: gridSource, pkName: primaryKey, pkValue: pkValue }, function(res) {
          if (res.status) {
            delete loader.data[currentRow];
            var rowIndex = currentRow;
            loader.data.length--;
            while (rowIndex<loader.data.length) {
              var row = loader.data[rowIndex+1];
              row.index = rowIndex;
              loader.data[rowIndex] = row;
              grid.invalidateRow(rowIndex);
              rowIndex++;
            }
            delete loader.data[rowIndex];
            grid.invalidateRow(rowIndex);
            grid.updateRowCount();
            grid.render();
            grid.scrollRowIntoView(currentRow-1);
            logAdd(res.sql, '');
          }
        });
      });
    }
  });

  $(document).on('click', "#gridNewField", function(event) {
    var currentRow = grid.getActiveCell().row;
    if (loader.data[currentRow]) {
      if (grid.getColumns()['_id'])
        primaryKey = grid.getColumns()['_id'].field;
      else
        primaryKey = grid.getColumns()[0].field;
      var pkValue = loader.data[currentRow][primaryKey];
      input('Add new field', 'Enter field name', '', function(newFieldName) {
        alert(newFieldName);
        $.post("/dbmi/grid/newField.json", { source: gridSource, pkName: primaryKey, pkValue: pkValue, newFieldName: newFieldName }, function(res) {
          if (res.status) {
            displayData(gridSource);
          } else alert('Error: can not add new field');
        });
      });
    }
  });

  /*
  gridEdit
  gridInsert
  gridNewField
  gridClone
  gridEmpty
  gridRemoveCell
  gridRemoveColumn
  */

  var curPanel = $("#footer .tabpanel > div").eq(0),
    curTab = $("#footer .tabbar ul li").eq(0);

  $(document).on('click', "#footer .tabbar ul li", function(event) {
    selectFooterTab(this);
  });

  function selectFooterTab(newTab) {
    var tabIndex = $(newTab).index(),
      panel = $("#footer .tabpanel > div").eq(tabIndex),
      tab = $("#footer .tabbar ul li").eq(tabIndex);
    if (curPanel!=panel) {
      curTab.removeClass('active');
      curPanel.hide();
      tab.addClass('active');
      panel.show();
      curTab = tab;
      curPanel = panel;
    }
  }

  $(document).on('click', "#btnExecuteCommand", function(event) {
    var sql = taCommands.val();
    $.post("/dbmi/query/execute.json", { source: gridSource, sql: sql }, function(res) {
      var msg = 'invalid database or not selected';
      if (res.msg) msg = res.msg;
      selectFooterTab($("#footer .tabbar ul li").eq(0)[0]);
      logAdd(sql, msg);
    });
  });

});