import React from 'react';
import { useStore } from '../store';

function Toolbar({ onAddNode, onSaveCanvas, chatModeNode, onTabClick }) {
  const {
    sidebarOpen,
    setSidebarOpen,
    chatMode,
    showSettings,
    tabs,
    activeTabId,
    setActiveTab,
    removeTab,
    chatSessions,
  } = useStore();

  const handleTabClick = (tab) => {
    setActiveTab(tab.id);
    if (onTabClick) {
      const session = chatSessions.find(s => s.id === tab.sessionId);
      if (session) {
        onTabClick(session);
      }
    }
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button
          className="sidebar-toggle-toolbar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <span className="sidebar-toggle-line"></span>
          <span className="sidebar-toggle-line"></span>
          <span className="sidebar-toggle-line"></span>
        </button>
      </div>

      <div className={`toolbar-tabs ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`toolbar-tab ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab)}
          >
            <span className="toolbar-tab-label">{tab.label}</span>
            <button
              className="toolbar-tab-close"
              onClick={(e) => handleCloseTab(e, tab.id)}
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="toolbar-right">
      </div>
    </div>
  );
}

export default Toolbar;
