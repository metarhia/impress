'use strict';

var initContext = function(context) {

  // Exit if no context or it is already initialized
  if (!context || context.isInitialized) return;
  // At the end of this function context.isInitialized will be set to true

  // Override method and save previous implementation to .inherited
  //
  Function.prototype.override = function(fn) {
    var superFunction = this;
    return function() {
      this.inherited = superFunction;
      return fn.apply(this, arguments);
    };
  };
  
  // Is string starts with given substring
  //
  String.prototype.startsWith = function(s) {
    return this.indexOf(s) === 0;
  };

  // Is string ends with given substring
  //
  String.prototype.endsWith = function(s) {
    if (s ==='' ) return true;
    return this.slice(-s.length) === s;
  };

  // Is string contains given substring
  //
  String.prototype.contains = function(s) {
    return this.indexOf(s) > -1;
  };

  context.isInitialized = true;

};

module.exports = initContext;
