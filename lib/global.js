'use strict';

var initContext = function(context) {

  // Exit if no context or it is already initialized
  if (!context || context.isInitialized) return;
  // At the end of this function context.isInitialized will be set to true

  if (typeof(window) !== 'undefined') context.global = window;

  context.isBrowser = typeof(exports) === 'undefined';
  context.isServer = !context.isBrowser;

  context.falseness = function() { return false; };
  context.trueness = function() { return true; };
  context.emptyness = function() { };

  // Object utils

  // Override method and save previous implementation to .inherited
  //
  Function.prototype.override = function(fn) {
    var superFunction = this;
    return function() {
      this.inherited = superFunction;
      return fn.apply(this, arguments);
    };
  };
  
  // Define inArray, if not implemented
  //
  context.inArray = function(array, value) {
    return array.indexOf(value) !== -1;
  };

  // Merge arrays
  //
  if (!Array.prototype.merge) {
    Object.defineProperty(Array.prototype, 'merge', {
      value: function(/* arrays to merge */) {
        var array;
        for (var i = 0; i < arguments.length; i++) {
          array = arguments[i];
          for (var j = 0; j < array.length; j++) {
            if (this.indexOf(array[j]) === -1) this.push(array[j]);
          }
        }
        return this;
      },
      enumerable: false
    });
  }

  // String utils
  
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
    
  String.prototype.ltrim = function() {
    return this.replace(/^\s+/,'');
  };

  String.prototype.rtrim = function() {
    return this.replace(/\s+$/,'');
  };
  
  String.prototype.capitalize = function() {
    return this.replace(/\w+/g, function(word) {
      return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    });
  };

  String.prototype.contains = function(s) {
    return this.indexOf(s) > -1;
  };

  if (typeof(String.prototype.startsWith) !== 'function') {
    String.prototype.startsWith = function(s) {
      return this.indexOf(s) === 0;
    };
  }

  if (typeof(String.prototype.endsWith) !== 'function') {
    String.prototype.endsWith = function(s) {
      if (s ==='' ) return true;
      return this.slice(-s.length) === s;
    };
  }

  String.prototype.lpad = function(padChar, length) {
    var padCount = length - this.length + 1;
    if (padCount < 0) padCount = 0;
    return new Array(padCount).join(padChar) + this;
  };

  String.prototype.rpad = function(padChar, length) {
    var padCount = length - this.length + 1;
    if (padCount < 0) padCount = 0;
    return this + new Array(padCount).join(padChar);
  };

  String.prototype.between = function(prefix, suffix) {
    var s = this,
        i = s.indexOf(prefix);
    if (i >= 0) s = s.substring(i + prefix.length);
    else return '';
    if (suffix) {
      i = s.indexOf(suffix);
      if (i >= 0) s = s.substring(0, i);
      else return '';
    }
    return s;
  };

  // Date utilities

  // Add toISOString support if no native support
  //   Example: '2012-01-01T12:30:15.120Z'
  //
  if (!context.Date.prototype.toISOString) {
    context.Date.prototype.toISOString = function() {
      function pad(n) { return n < 10 ? '0' + n : n; }
      return (
        this.getUTCFullYear() + '-' +
        pad(this.getUTCMonth() + 1) + '-' +
        pad(this.getUTCDate()) + 'T' +
        pad(this.getUTCHours()) + ':' +
        pad(this.getUTCMinutes()) + ':' +
        pad(this.getUTCSeconds()) + 'Z'
      );
    };
  }

  // toSimpleString return date string in local timezone
  //   Example: '2012-01-01 12:30'
  // 
  context.Date.prototype.toSimpleString = function() {
    function pad(n) { return n < 10 ? '0' + n : n; }
    if (isNaN(this.getTime())) return '';
    else return (
      this.getUTCFullYear() + '-' +
      pad(this.getUTCMonth() + 1) + '-' +
      pad(this.getUTCDate()) + ' ' +
      pad(this.getUTCHours()) + ':' +
      pad(this.getUTCMinutes())
    );
  };

  // Return true for scalar vars and false for arrays and objects
  //
  context.isScalar = function(variable) {
    return (/boolean|number|string/).test(typeof(variable));
  };

  context.isInitialized = true;

};

if (typeof(window) === 'undefined') module.exports = initContext;
else initContext(window);
