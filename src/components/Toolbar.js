import React, { useState, useRef, useEffect } from 'react';
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
    reorderTabs,
    chatSessions,
  } = useStore();

  const [dragState, setDragState] = useState(null);
  const tabRefs = useRef({});
  const tabsContainerRef = useRef(null);
  const tabWidthsRef = useRef({});
  const tabPositionsRef = useRef({});
  const clickedRef = useRef(false);

  const handleTabClick = (tab) => {
    if (clickedRef.current) {
      clickedRef.current = false;
      return;
    }
    setActiveTab(tab.id);
    if (onTabClick) {
      const session = chatSessions.find(s => s.id === tab.sessionId);
      if (session) {
        onTabClick(session, tab.id);
      }
    }
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  const handleMouseDown = (e, tab, index) => {
    if (e.button !== 0) return;

    const tabEl = tabRefs.current[tab.id];
    if (!tabEl) return;

    // Store tab widths and positions
    const widths = {};
    const positions = {};
    let accX = 0;
    tabs.forEach(t => {
      const el = tabRefs.current[t.id];
      if (el) {
        const w = el.getBoundingClientRect().width;
        widths[t.id] = w;
        positions[t.id] = accX;
        accX += w;
      }
    });
    tabWidthsRef.current = widths;
    tabPositionsRef.current = positions;

    const rect = tabEl.getBoundingClientRect();
    const containerRect = tabsContainerRef.current.getBoundingClientRect();

    setDragState({
      tabId: tab.id,
      originalIndex: index,
      currentIndex: index,
      offsetX: e.clientX - rect.left,
      initialLeft: rect.left - containerRect.left,
      currentX: rect.left - containerRect.left,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e) => {
      const containerRect = tabsContainerRef.current.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragState.offsetX;

      const draggedTabWidth = tabWidthsRef.current[dragState.tabId] || 120;
      const dragCenterX = newX + draggedTabWidth / 2;

      let newIndex = dragState.originalIndex;

      for (let i = 0; i < tabs.length; i++) {
        if (i === dragState.originalIndex) continue;

        const tab = tabs[i];
        const tabPos = tabPositionsRef.current[tab.id];
        const tabWidth = tabWidthsRef.current[tab.id] || 120;
        const tabCenterX = tabPos + tabWidth / 2;

        if (i < dragState.originalIndex && dragCenterX < tabCenterX) {
          newIndex = Math.min(newIndex, i);
        } else if (i > dragState.originalIndex && dragCenterX > tabCenterX) {
          newIndex = Math.max(newIndex, i);
        }
      }

      setDragState(prev => ({
        ...prev,
        currentIndex: newIndex,
        currentX: newX,
      }));
    };

    const handleMouseUp = () => {
      const moved = Math.abs(dragState.currentX - dragState.initialLeft) > 5;

      if (moved && dragState.currentIndex !== dragState.originalIndex) {
        const { originalIndex, currentIndex } = dragState;

        // Reorder tabs first
        const newTabs = [...tabs];
        const [removed] = newTabs.splice(originalIndex, 1);
        newTabs.splice(currentIndex, 0, removed);
        reorderTabs(newTabs);
        clickedRef.current = true;

        // Clear dragState after DOM has updated
        requestAnimationFrame(() => {
          setDragState(null);
        });
      } else {
        setDragState(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, tabs, reorderTabs]);

  const getTabStyle = (tab, index) => {
    if (!dragState) return {};

    const draggedTabWidth = tabWidthsRef.current[dragState.tabId] || 120;

    // Style for the dragged tab - always apply transform
    if (tab.id === dragState.tabId) {
      return {
        transform: `translateX(${dragState.currentX - dragState.initialLeft}px)`,
        zIndex: 100,
        transition: 'none',
      };
    }

    const origIdx = dragState.originalIndex;
    const currIdx = dragState.currentIndex;

    let offset = 0;
    if (origIdx < currIdx) {
      if (index > origIdx && index <= currIdx) {
        offset = -draggedTabWidth;
      }
    } else if (origIdx > currIdx) {
      if (index >= currIdx && index < origIdx) {
        offset = draggedTabWidth;
      }
    }

    return {
      transform: offset !== 0 ? `translateX(${offset}px)` : 'translateX(0)',
      transition: 'none',
    };
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

      {!showSettings && (
        <div
          ref={tabsContainerRef}
          className={`toolbar-tabs ${sidebarOpen ? 'sidebar-open' : ''}`}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              ref={el => tabRefs.current[tab.id] = el}
              className={`toolbar-tab ${activeTabId === tab.id ? 'active' : ''} ${dragState?.tabId === tab.id ? 'dragging' : ''}`}
              style={getTabStyle(tab, index)}
              onClick={() => handleTabClick(tab)}
              onMouseDown={(e) => handleMouseDown(e, tab, index)}
            >
              <span className="toolbar-tab-label">{tab.label}</span>
              <button
                className="toolbar-tab-close"
                onClick={(e) => handleCloseTab(e, tab.id)}
                onMouseDown={(e) => e.stopPropagation()}
                title="Close tab"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="toolbar-right">
      </div>
    </div>
  );
}

export default Toolbar;
