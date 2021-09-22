chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.check_da) {
    const DAMeta = document.querySelector('meta[name="data-accounting-mediawiki"]');
    if (DAMeta && DAMeta instanceof HTMLMetaElement) {
      sendResponse(DAMeta.content);
    } else {
      sendResponse(null);
    }
  } else {
    sendResponse(null);
  }
});
