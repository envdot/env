import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { setWebviewElement } from '../webviewRef';
import ChromeImportModal from './ChromeImportModal';
import TransferInfoPanel from './TransferInfoPanel';

function BrowserPanel() {
  const webviewRef = useRef(null);
  const menuRef = useRef(null);
  const { browserModeUrl, setBrowserModeUrl, chatPanelWidth, setChatPanelWidth, setBrowserMode, showChecklistPanel, setShowChecklistPanel, showChromeImportModal, setShowChromeImportModal, chromeProfile } = useStore();
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(browserModeUrl);
  const [urlInput, setUrlInput] = useState(browserModeUrl === 'about:blank' ? '' : browserModeUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Click outside to dismiss menu
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  // Expose webview to shared ref for tool access
  useEffect(() => {
    setWebviewElement(webviewRef.current);
    return () => { setWebviewElement(null); };
  }, []);

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

  // React to external browserModeUrl changes (e.g. from openFileInViewer)
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !browserModeUrl || browserModeUrl === 'about:blank') return;
    // Only navigate if the URL differs from what's currently loaded
    if (browserModeUrl !== currentUrl) {
      setUrlInput(browserModeUrl);
      webview.loadURL(browserModeUrl).catch(err => {
        if (!err.message?.includes('ERR_ABORTED')) {
          console.warn('BrowserPanel navigate error:', err.message);
        }
      });
    }
  }, [browserModeUrl]); // eslint-disable-line

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    let navigateUrl = urlInput.trim();
    if (!navigateUrl) return;
    // Add https:// if no protocol (allow file:// through)
    if (!/^(https?|file):\/\//i.test(navigateUrl)) {
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
          <div className="browser-panel-menu-container" ref={menuRef}>
            <button
              className="browser-panel-nav-btn browser-panel-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
              title="Browser menu"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5"/>
                <circle cx="8" cy="8" r="1.5"/>
                <circle cx="8" cy="13" r="1.5"/>
              </svg>
            </button>
            {showMenu && (
              <div className="browser-panel-dropdown">
                <button
                  className="browser-panel-dropdown-item"
                  onClick={() => { setShowChromeImportModal(true); setShowMenu(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                    <path d="M2 12h20"/>
                  </svg>
                  Import Chrome Profile
                </button>
                {chromeProfile && (
                  <button
                    className="browser-panel-dropdown-item"
                    onClick={() => { setShowTransferInfo(true); setShowMenu(false); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    Transfer Info
                  </button>
                )}
                <button
                  className="browser-panel-dropdown-item"
                  onClick={() => { setShowChecklistPanel(!showChecklistPanel); setShowMenu(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  {showChecklistPanel ? 'Hide Checklist' : 'Checklist'}
                </button>
                <button
                  className="browser-panel-dropdown-item"
                  onClick={() => { setBrowserMode(false); setShowMenu(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Close Browser
                </button>
              </div>
            )}
          </div>
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
      {showChromeImportModal && (
        <ChromeImportModal onClose={() => setShowChromeImportModal(false)} />
      )}
      {showTransferInfo && (
        <TransferInfoPanel onClose={() => setShowTransferInfo(false)} />
      )}
    </>
  );
}

export default BrowserPanel;
