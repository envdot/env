import React from 'react';
import { useStore } from '../store';

function Toolbar({ onAddNode, onSaveCanvas, chatModeNode }) {
  const { sidebarOpen, setSidebarOpen, chatMode, showSettings } = useStore();

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

      <div className="toolbar-center">
      </div>

      <div className="toolbar-right">
      </div>
    </div>
  );
}

export default Toolbar;
