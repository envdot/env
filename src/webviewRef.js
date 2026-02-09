// Shared webview reference — avoids circular dependency between store.js and BrowserPanel.js
let _webviewElement = null;

export function setWebviewElement(el) {
  _webviewElement = el;
}

export function getWebviewElement() {
  return _webviewElement;
}
