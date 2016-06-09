(function () {
  'use strict';
  var backgroundPage = chrome.extension.getBackgroundPage();
  var optionsState = backgroundPage.optionsState;
  var mobx = backgroundPage.mobx;

  var debugCheckbox = document.getElementById('debug_log_checkbox');
  var claireCheckbox = document.getElementById('claire_guide');

  var dispose = mobx.autorun(function () {
    debugCheckbox.checked = optionsState.debug;
    claireCheckbox.checked = optionsState.hideGuide;
  });

  debugCheckbox.onclick = function (e) {
    optionsState.debug = e.target.checked;
  };

  claireCheckbox.onclick = function (e) {
    optionsState.hideGuide = e.target.checked;
  };

  window.onunload = function () {
    dispose();
  };
})();
