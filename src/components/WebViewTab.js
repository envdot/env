import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';

function WebViewTab({ tabId, url }) {
  const webviewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [urlInput, setUrlInput] = useState(url);
  const [isLoading, setIsLoading] = useState(true);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const dotsMenuRef = useRef(null);
  const { updateWebTabUrl, updateTabLabel } = useStore();
  const sidebarOpen = useStore(state => state.sidebarOpen);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleNavigate = (e) => {
      setCurrentUrl(e.url);
      setUrlInput(e.url);
      updateWebTabUrl(tabId, e.url);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    const handlePageTitle = (e) => {
      if (e.title) {
        updateTabLabel(tabId, e.title);
      }
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
      // ERR_ABORTED (-3) is normal during redirects, ignore it
      // Also ignore ERR_BLOCKED_BY_CLIENT (-20) from ad blockers etc.
      const ignoredCodes = [-3, -20, -27];
      if (ignoredCodes.includes(e.errorCode)) return;
      console.warn('Webview load failed:', e.errorCode, e.errorDescription, e.validatedURL);
    };

    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);
    webview.addEventListener('page-title-updated', handlePageTitle);
    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('new-window', handleNewWindow);
    webview.addEventListener('did-fail-load', handleFailLoad);

    return () => {
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
      webview.removeEventListener('page-title-updated', handlePageTitle);
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('new-window', handleNewWindow);
      webview.removeEventListener('did-fail-load', handleFailLoad);
    };
  }, [tabId, updateWebTabUrl, updateTabLabel]);

  // Close dots menu on outside click
  useEffect(() => {
    if (!showDotsMenu) return;
    const handleClickOutside = (e) => {
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target)) {
        setShowDotsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDotsMenu]);

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    let navigateUrl = urlInput.trim();
    if (!navigateUrl) return;
    // Add https:// if no protocol (allow file:// through)
    if (!/^(https?|file):\/\//i.test(navigateUrl)) {
      navigateUrl = 'https://' + navigateUrl;
    }
    setUrlInput(navigateUrl);
    if (webviewRef.current) {
      webviewRef.current.loadURL(navigateUrl);
    }
  };

  return (
    <div className={`webview-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="webview-toolbar">
        <button
          className="webview-nav-btn"
          onClick={() => webviewRef.current?.goBack()}
          disabled={!canGoBack}
          title="Back"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2L4 8l6 6"/>
          </svg>
        </button>
        <button
          className="webview-nav-btn"
          onClick={() => webviewRef.current?.goForward()}
          disabled={!canGoForward}
          title="Forward"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2l6 6-6 6"/>
          </svg>
        </button>
        <button
          className="webview-nav-btn"
          onClick={() => {
            if (isLoading) webviewRef.current?.stop();
            else webviewRef.current?.reload();
          }}
          title={isLoading ? 'Stop' : 'Reload'}
        >
          {isLoading ? '\u00d7' : '\u21bb'}
        </button>
        <form className="webview-url-form" onSubmit={handleUrlSubmit}>
          <input
            className="webview-url-input"
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            spellCheck={false}
          />
        </form>
        <div className="webview-dots-container" ref={dotsMenuRef}>
          <button
            className="webview-nav-btn"
            onClick={() => setShowDotsMenu(!showDotsMenu)}
            title="More options"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
          {showDotsMenu && (
            <div className="webview-dots-dropdown">
              <div className="webview-dots-dropdown-empty">No options yet</div>
            </div>
          )}
        </div>
      </div>
      <webview
        ref={webviewRef}
        src={url}
        className="webview-frame"
        allowpopups="true"
      />
    </div>
  );
}

export default WebViewTab;
