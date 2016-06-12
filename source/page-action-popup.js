(function () {
  'use strict';
  /* global $ */
  var backgroundPage = chrome.extension.getBackgroundPage();
  var mobx = backgroundPage.mobx;
  var optionsState = backgroundPage.optionsState;
  // get the current tab's ID and extract request info
  // from the extension object
  var queryInfo = {
    active: true,
    windowId: chrome.windows.WINDOW_ID_CURRENT
  };
  var dispose = function () {};

  chrome.tabs.query(queryInfo, function (tabs) {
    var tabID = tabs[0].id;
    dispose = mobx.autorun(function () {
      if (optionsState.hideGuide) {
        $('#claireInfoImage').hide();
      } else {
        $('#claireInfoImage').show();
      }

      var request = backgroundPage.requests.get(tabID);

      $('#ip').val(request.IP);

      $('#claireInfoImage img').attr('src', request.guideIcon);

      // show the Ray ID & location
      if (request.isCloudFlare) {
        var loc = request.location;
        $('#rayID').val(request.rayID);
        $('#locationCode').text(loc.code);

        if (loc.city && loc.country) {
          $('#locationName').text(loc.city + ', ' + loc.country);
        } else {
          $('#locationName').text('');
        }

        var traceURL = new URL(request.url);
        traceURL.pathname = '/cdn-cgi/trace';
        $('#traceURL').attr('href', traceURL);
      } else {
        $('#ray').attr('hidden', true);
        $('#loc').attr('hidden', true);
        $('#actions').attr('hidden', true);
      }

      // show Railgun related info
      if (request.isViaRailgun) {
        var railgun = request.railgun;

        switch (railgun.state) {
          case 'compressed':
          case 'stream':
            $('#railgunID').text(railgun.id).show();

            if (railgun.isCompressed) {
              $('#railgunCompression').text(100 - railgun.compressionRatio + '%');
            } else {
              $('#railgunCompression').text('stream');
            }
            $('#railgunTime').text(railgun.originTime + 'sec').show();
            break;
          case 'error':
          case 'normal':
            $('#railgunID').text(railgun.id).show();
            $('#railgunCompression').text(railgun.state);
            $('#railgunTime').hide();
            break;
          case 'direct':
            $('#railgunID').hide();
            $('#railgunCompression').text('direct');
            $('#railgunTime').hide();
            break;
          default:
            $('#railgun').attr('hidden', true);
        }
      } else {
        $('#railgun').attr('hidden', true);
      }
    });
  });

  $('.copy-button').on('click', function (evt) {
    var $el = $(this);
    var copyId = $el.data('copyId');
    var $copyEl = $('#' + copyId);

    $copyEl.select();
    document.execCommand('copy');

    evt.preventDefault();
  });

  window.onunload = function () {
    dispose();
  };
})();
