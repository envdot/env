import React from 'react';
import { useStore } from '../store';

function Toolbar({ onAddNode, onSaveCanvas, chatModeNode }) {
  const { sidebarOpen, setSidebarOpen, chatMode, exportConversationToMarkdown } = useStore();

  const handleExportMarkdown = () => {
    if (!chatMode) return;

    const markdown = exportConversationToMarkdown(chatMode);
    if (!markdown) {
      alert('No conversation to export');
      return;
    }

    // Create a blob and download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${chatMode}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

      <div className="toolbar-center">
      </div>

      <div className="toolbar-right">
        {!chatMode && (
          <button className="toolbar-btn icon-btn" onClick={onAddNode} title="Add Chat Node">
            +
          </button>
        )}
        {chatMode && chatModeNode && (
          <button
            className="toolbar-btn icon-btn"
            onClick={handleExportMarkdown}
            title="Export to Markdown"
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
}

export default Toolbar;
