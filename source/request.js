/* global define */
define(['airports', 'mobx', 'railgun'], function (airports, mobx, Railgun) {
  'use strict';

  // the Request object, contains information about a request
  var Request = function (details) {
    this.id = details.requestId;
    this.fromCache = details.fromCache;
    this.tabId = details.tabId;
    this.url = details.url;
    this.IP = details.ip;

    mobx.extendObservable(this, {
      responseHeaders: details.responseHeaders,
      hasConnectionInfo: false,
      SPDY: false,
      connectionType: null,
      headers: function () {
        return this.responseHeaders.reduce(function (headers, header) {
          headers[header.name.toUpperCase()] = header.value;
          return headers;
        }, {});
      },
      railgun: function () {
        var header = this.headers['CF-RAILGUN'];

        if (header) {
          return new Railgun(this.headers['CF-RAILGUN']);
        }
        return null;
      },
      rayID: function () {
        return this.headers['CF-RAY'].split('-')[0];
      },
      isCloudFlare: function () {
        return this.headers.hasOwnProperty('SERVER') && this.headers.SERVER === 'cloudflare-nginx';
      },
      isViaRailgun: function () {
        return this.headers.hasOwnProperty('CF-RAILGUN');
      },
      isSPDY: function () {
        return this.SPDY && this.connectionType.match(/^spdy/);
      },
      isH2: function () {
        return this.SPDY && this.connectionType === 'h2';
      },
      isIPv6: function () {
        return this.IP && this.IP.indexOf(':') !== -1;
      },
      location: mobx.asStructure(function () {
        var code = this.headers['CF-RAY'].split('-')[1];
        var airport = airports[code] || {};

        return {
          code: code,
          city: airport.city,
          country: airport.country
        };
      }),
      pageActionIcon: function () {
        return this.getImagePath('images/claire-3-');
      },
      guideIcon: function () {
        return this.getImagePath('images/claire-3-popup-');
      }
    });
  };

  Request.prototype.queryConnectionInfoAndSetIcon = function () {
    var tabID = this.tabId;
    if (this.hasConnectionInfo) {
      this.setPageActionIconAndPopup();
    } else {
      var csMessageData = {
        action: 'check_connection_info'
      };
      var csMessageCallback = function (csMsgResponse) {
        // stop and return if we don't get a response, happens with hidden/background tabs
        if (typeof csMsgResponse === 'undefined') {
          return;
        }

        var request = window.requests.get(tabID);
        request.setConnectionInfo(csMsgResponse);
        request.setPageActionIconAndPopup();
      };

      try {
        chrome.tabs.sendMessage(this.tabId, csMessageData, csMessageCallback);
      } catch (e) {
        console.log('caught exception when sending message to content script');
        console.log(chrome.extension.lastError());
        console.log(e);
      }
    }
  };

  Request.prototype.getImagePath = function (basePath) {
    var iconPathParts = [];

    if (this.isCloudFlare) {
      iconPathParts.push('on');
    } else {
      iconPathParts.push('off');
    }

    if (this.isSPDY) {
      iconPathParts.push('spdy');
    } else if (this.isH2) {
      iconPathParts.push('h2');
    }

    if (this.isIPv6) {
      iconPathParts.push('ipv6');
    }

    if (this.isViaRailgun) {
      iconPathParts.push('rg');
    }

    return basePath + iconPathParts.join('-') + '.png';
  };

  Request.prototype.setConnectionInfo = mobx.action('setConnectionInfo', function (connectionInfo) {
    this.hasConnectionInfo = true;
    this.SPDY = connectionInfo.spdy;
    this.connectionType = connectionInfo.type;
  });

  Request.prototype.setPageActionIconAndPopup = function () {
    var iconPath = this.pageActionIcon;
    var tabID = this.tabId;
    chrome.pageAction.setIcon({
      tabId: this.tabId,
      path: iconPath
    }, function () {
      try {
        chrome.pageAction.setPopup({
          tabId: tabID,
          popup: 'page-action-popup.html'
        });
        chrome.pageAction.show(tabID);
      } catch (e) {
        console.log('Exception on page action show for tab with ID: ', tabID, e);
      }
    });
  };

  Request.prototype.logToConsole = function () {
    if (!window.optionsState.debug) {
      return;
    }

    console.groupCollapsed('request %s', this.id);
    console.log('%c%s%c: %s', 'font-weight:bold', 'url', 'font-weight:normal', this.url);
    console.log('%c%s%c: %s', 'font-weight:bold', 'ip', 'font-weight:normal', this.IP);
    console.log('%c%s%c: %s', 'font-weight:bold', 'CloudFlare', 'font-weight:normal', this.isCloudFlare);
    if (this.isCloudFlare) {
      console.log('%c%s%c: %s', 'font-weight:bold', 'Ray ID', 'font-weight:normal', this.rayID);

      if (this.isViaRailgun) {
        this.railgun.logToConsole();
      }
    }
    console.groupEnd('request %s', this.id);
  };

  return Request;
});
