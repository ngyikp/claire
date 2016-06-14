function determineConnectionInfo() {
  var loadTimes = chrome.loadTimes();
  return {
    spdy: loadTimes.wasFetchedViaSpdy,
    type: loadTimes.npnNegotiatedProtocol || loadTimes.connectionInfo
  };
}

// when executed, notify the extension about the connection info
chrome.runtime.sendMessage(determineConnectionInfo(), function () {});
