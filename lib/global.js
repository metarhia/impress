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

  // Is string starts with given substring
  //
  if (typeof(String.prototype.startsWith) !== 'function') {
    String.prototype.startsWith = function(s) {
      return this.indexOf(s) === 0;
    };
  }

  // Is string ends with given substring
  //
  if (typeof(String.prototype.endsWith) !== 'function') {
    String.prototype.endsWith = function(s) {
      if (s ==='' ) return true;
      return this.slice(-s.length) === s;
    };
  }

  // Is string contains given substring
  //
  String.prototype.contains = function(s) {
    return this.indexOf(s) > -1;
  };

  context.isInitialized = true;

};

if (typeof(window) === 'undefined') module.exports = initContext;
else initContext(window);
