import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';

function ConnectorsOverlay({ onClose }) {
  const { sidebarOpen } = useStore();
  const overlayRef = useRef(null);
  const [activeTab, setActiveTab] = useState('apps');

  // Close on clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayRef.current === event.target) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="connectors-overlay-backdrop" ref={overlayRef}>
      <div className={`connectors-overlay ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button className="connectors-overlay-close" onClick={onClose}>
          ✕
        </button>

        <div className="connectors-overlay-content">
          <h2 className="connectors-overlay-title">Connectors</h2>

          {/* Top Banner - My Browser */}
          <div className="connectors-banner">
            <div className="connectors-banner-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <div className="connectors-banner-text">
              <div className="connectors-banner-title">My Browser</div>
            </div>
            <button className="connectors-banner-btn">Connect</button>
          </div>

          {/* Tabs */}
          <div className="connectors-tabs">
            <button
              className={`connectors-tab ${activeTab === 'apps' ? 'active' : ''}`}
              onClick={() => setActiveTab('apps')}
            >
              Apps
            </button>
            <button
              className={`connectors-tab ${activeTab === 'custom-api' ? 'active' : ''}`}
              onClick={() => setActiveTab('custom-api')}
            >
              Custom API
            </button>
            <button
              className={`connectors-tab ${activeTab === 'custom-mcp' ? 'active' : ''}`}
              onClick={() => setActiveTab('custom-mcp')}
            >
              Custom MCP
            </button>
            <div className="connectors-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input type="text" placeholder="Search" />
            </div>
          </div>

          {/* Apps Grid */}
          <div className="connectors-grid">
            {/* Skeleton items - no hardcoded apps */}
            <div className="connector-card skeleton">
              <div className="connector-icon skeleton-icon"></div>
              <div className="connector-info">
                <div className="connector-name skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
              </div>
            </div>

            <div className="connector-card skeleton">
              <div className="connector-icon skeleton-icon"></div>
              <div className="connector-info">
                <div className="connector-name skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
              </div>
            </div>

            <div className="connector-card skeleton">
              <div className="connector-icon skeleton-icon"></div>
              <div className="connector-info">
                <div className="connector-name skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
              </div>
            </div>

            <div className="connector-card skeleton">
              <div className="connector-icon skeleton-icon"></div>
              <div className="connector-info">
                <div className="connector-name skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
              </div>
            </div>

            <div className="connector-card skeleton">
              <div className="connector-icon skeleton-icon"></div>
              <div className="connector-info">
                <div className="connector-name skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
              </div>
            </div>

            <div className="connector-card skeleton">
              <div className="connector-icon skeleton-icon"></div>
              <div className="connector-info">
                <div className="connector-name skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
              </div>
            </div>

            <div className="connector-card skeleton">
              <div className="connector-icon skeleton-icon"></div>
              <div className="connector-info">
                <div className="connector-name skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
              </div>
            </div>

            <div className="connector-card skeleton">
              <div className="connector-icon skeleton-icon"></div>
              <div className="connector-info">
                <div className="connector-name skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
                <div className="connector-description skeleton-text"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectorsOverlay;
