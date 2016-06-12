/* global define */
define(function () {
  'use strict';
  var re5part = /^([a-f0-9]*)\s([\d.]*|stream)\s([\d.]*)\s([a-f0-9]{4})\s([a-f0-9]{4})/i;
  var re4part = /^([a-f0-9]*)\s([a-f0-9]{4})\s(error|normal)\s([a-f0-9]{4})/i;

  var Railgun = function (header) {
    this.id = this.compressionRatio = this.originTime = this.version = null;
    this.flags = [];
    this.isDirect = this.isStream = this.isNormal = this.isError = this.isCompressed = false;
    this.state = 'unknown';

    var matched;
    var state;

    if (!header) {
      return;
    }

    if (header.match(/^direct/)) {
      // is a direct header
      this.isDirect = true;
      this.state = 'direct';

      return;
    }

    if (header.match(re4part)) {
      matched = header.exec(re4part);
      state = matched[3];

      this.id = matched[1];
      this.version = matched[4];

      if (state === 'error') {
        this.isError = true;
        this.state = 'error';
      } else {
        this.isNormal = true;
        this.state = 'normal';
      }

      return;
    }

    if (header.match(re5part)) {
      matched = re5part.exec(header);
      this.id = matched[1];
      this.originTime = matched[3];
      this.version = matched[5];

      state = matched[2];

      if (state === 'stream') {
        this.isStream = true;
        this.state = 'stream';
      } else {
        this.isCompressed = true;
        this.compressionRatio = state;
        this.state = 'compressed';
      }

      return;
    }
  };

  Railgun.prototype.logToConsole = function () {
    console.groupCollapsed('Railgun');
    if (this.id) {
      console.log('%c%s%c: %s', 'font-weight:bold', 'ID', 'font-weight:normal', this.id);
    }
    console.log('%c%s%c: %s', 'font-weight:bold', 'state', 'font-weight:normal', this.state);

    if (this.isCompressed) {
      console.log('%c%s%c: %s', 'font-weight:bold', 'compression ratio', 'font-weight:normal', this.compressionRatio);
    }
    console.groupEnd('Railgun');
  };

  return Railgun;
});
