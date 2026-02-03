import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';

function BrowserPanel() {
  const webviewRef = useRef(null);
  const { browserModeUrl, setBrowserModeUrl, chatPanelWidth, setChatPanelWidth } = useStore();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(browserModeUrl);
  const [urlInput, setUrlInput] = useState(browserModeUrl === 'about:blank' ? '' : browserModeUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleNavigate = (e) => {
      setCurrentUrl(e.url);
      setUrlInput(e.url === 'about:blank' ? '' : e.url);
      setBrowserModeUrl(e.url);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    const handleDidStartLoading = () => setIsLoading(true);
    const handleDidStopLoading = () => {
      setIsLoading(false);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    const handleNewWindow = (e) => {
      e.preventDefault();
      webview.loadURL(e.url);
    };

    const handleFailLoad = (e) => {
      const ignoredCodes = [-3, -20, -27];
      if (ignoredCodes.includes(e.errorCode)) return;
      console.warn('BrowserPanel load failed:', e.errorCode, e.errorDescription, e.validatedURL);
    };

    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);
    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('new-window', handleNewWindow);
    webview.addEventListener('did-fail-load', handleFailLoad);

    return () => {
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('new-window', handleNewWindow);
      webview.removeEventListener('did-fail-load', handleFailLoad);
    };
  }, [setBrowserModeUrl]);

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    let navigateUrl = urlInput.trim();
    if (!navigateUrl) return;
    // Add https:// if no protocol
    if (!/^https?:\/\//i.test(navigateUrl)) {
      navigateUrl = 'https://' + navigateUrl;
    }
    setUrlInput(navigateUrl);
    setBrowserModeUrl(navigateUrl);
    if (webviewRef.current) {
      try {
        await webviewRef.current.loadURL(navigateUrl);
      } catch (err) {
        // ERR_ABORTED is normal during redirects, ignore it
        if (!err.message?.includes('ERR_ABORTED')) {
          console.warn('Navigation error:', err.message);
        }
      }
    }
  };

  // Resizer handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      // Calculate width from right edge of window
      const newWidth = window.innerWidth - e.clientX;
      // Clamp between 300 and 800 pixels
      const clampedWidth = Math.min(Math.max(newWidth, 300), 800);
      setChatPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setChatPanelWidth]);

  return (
    <>
      <div className="browser-panel" style={{ right: chatPanelWidth }}>
        <div className="browser-panel-toolbar">
          <button
            className="browser-panel-nav-btn"
            onClick={() => webviewRef.current?.goBack()}
            disabled={!canGoBack}
            title="Back"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2L4 8l6 6"/>
            </svg>
          </button>
          <button
            className="browser-panel-nav-btn"
            onClick={() => webviewRef.current?.goForward()}
            disabled={!canGoForward}
            title="Forward"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2l6 6-6 6"/>
            </svg>
          </button>
          <button
            className="browser-panel-nav-btn"
            onClick={() => {
              if (isLoading) webviewRef.current?.stop();
              else webviewRef.current?.reload();
            }}
            title={isLoading ? 'Stop' : 'Reload'}
          >
            {isLoading ? '\u00d7' : '\u21bb'}
          </button>
          <form className="browser-panel-url-form" onSubmit={handleUrlSubmit}>
            <input
              className="browser-panel-url-input"
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="Enter URL..."
              spellCheck={false}
            />
          </form>
        </div>
        <webview
          ref={webviewRef}
          src={browserModeUrl}
          className="browser-panel-frame"
          allowpopups="true"
          style={{ pointerEvents: isResizing ? 'none' : 'auto' }}
        />
      </div>
      {/* Resizer handle */}
      <div
        className={`browser-panel-resizer ${isResizing ? 'resizing' : ''}`}
        style={{ right: chatPanelWidth - 3 }}
        onMouseDown={handleMouseDown}
      />
    </>
  );
}

export default BrowserPanel;
