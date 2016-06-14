// Claire
/* global define */
define(['request', 'mobx'], function (Request, mobx) {
  'use strict';
  window.mobx = mobx;
  var optionsState = window.optionsState = mobx.observable({
    debug: localStorage.debug_logging === 'yes',
    hideGuide: localStorage.hide_guide === 'yes'
  });

  mobx.autorun(function () {
    localStorage.debug_logging = optionsState.debug ? 'yes' : 'no'; // eslint-disable-line camelcase
    localStorage.hide_guide = optionsState.hideGuide ? 'yes' : 'no'; // eslint-disable-line camelcase
  });

  // a mapping of tab IDs to window.requests
  var requests = window.requests = mobx.observable(mobx.asMap({}));

  mobx.reaction(function () {
    var result = [];
    requests.forEach(function (request) {
      result.push({
        pageActionIcon: request.pageActionIcon,
        tabId: request.tabId
      });
    });
    return result;
  }, function (requests) {
    requests.forEach(function (request) {
      setPageAction(request);
    });
  });

  function setPageAction(request) {
    var iconPath = request.pageActionIcon;
    var tabID = request.tabId;
    chrome.pageAction.setIcon({
      tabId: tabID,
      path: iconPath
    }, function () {
      try {
        chrome.pageAction.setPopup({
          tabId: tabID,
          popup: 'page-action-popup.html'
        });
        chrome.pageAction.show(tabID);
      } catch (e) {
        console.error('Exception on page action show for tab with ID: ', tabID, e);
      }
    });
  }

  // listen to all web requests and when request is completed, create a new
  // Request object that contains a bunch of information about the request
  var processCompletedRequest = function (details) {
    if (details.tabId === chrome.tabs.TAB_ID_NONE) {
      // if the request doesn't correspond to a tab, ignore
      // (generally this means loading a Claire page)
      return;
    }

    var request = new Request(details);
    window.requests.set(details.tabId, request);
    request.logToConsole();
  };

  var filter = {
    urls: ['<all_urls>'],
    types: ['main_frame']
  };

  var extraInfoSpec = ['responseHeaders'];

  // start listening to all web window.requests
  chrome.webRequest.onCompleted.addListener(processCompletedRequest, filter, extraInfoSpec);

  // when a tab is replaced, usually when a request started in a background tab
  // and then the tab is upgraded to a regular tab (becomes visible)
  chrome.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
    if (window.requests.has(removedTabId)) {
      mobx.transaction(function () {
        var request = window.requests.get(removedTabId);
        request.tabId = addedTabId;
        window.requests.set(addedTabId, request);
        window.requests.delete(removedTabId);
      });
    } else {
      console.log('Could not find an entry in window.requests when replacing ', removedTabId);
    }
  });

  chrome.runtime.onMessage.addListener(function (csRequest, sender, sendResponse) {
    var request = window.requests.get(sender.tab.id);
    if (request) {
      request.setConnectionInfo(csRequest);
    }
    sendResponse({});
  });

  // clear request data when tabs are destroyed
  chrome.tabs.onRemoved.addListener(function (tabId) {
    window.requests.delete(tabId);
  });
});
