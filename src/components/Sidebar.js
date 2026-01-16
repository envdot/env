import React, { useState } from 'react';
import { useStore } from '../store';

function Sidebar({ nodes, onLoadSession, onSaveSession, onNewSession, onNewChatWithMode, addChatNode }) {
  const {
    sidebarOpen,
    setSidebarOpen,
    chatSessions,
    activeChatSession,
    setActiveChatSession,
    addChatSession,
    updateChatSession,
    deleteChatSession,
    reorderChatSessions,
  } = useStore();

  const [editingSession, setEditingSession] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [draggedSession, setDraggedSession] = useState(null);

  const handleNewSession = () => {
    const sessionId = `session-${Date.now()}`;
    const newSession = {
      id: sessionId,
      name: `Chat ${chatSessions.length + 1}`,
      timestamp: Date.now(),
      nodes: [],
      edges: [],
    };
    addChatSession(newSession);
    setActiveChatSession(sessionId);
    if (onNewSession) onNewSession(newSession);

    // Create a chat node and enter chat mode
    if (addChatNode && onNewChatWithMode) {
      const nodeId = addChatNode({ x: 200, y: 200 });
      onNewChatWithMode(nodeId);
    }
  };


  const handleLoadSession = (session) => {
    setActiveChatSession(session.id);
    if (onLoadSession) onLoadSession(session);
  };

  const handleRenameSession = (sessionId, newName) => {
    updateChatSession(sessionId, { name: newName });
    setEditingSession(null);
    setEditingName('');
  };

  const startEditing = (session) => {
    setEditingSession(session.id);
    setEditingName(session.name);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDragStart = (e, session) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetSession) => {
    e.preventDefault();
    if (!draggedSession || draggedSession.id === targetSession.id) {
      setDraggedSession(null);
      return;
    }

    const sessions = [...chatSessions];
    const draggedIndex = sessions.findIndex(s => s.id === draggedSession.id);
    const targetIndex = sessions.findIndex(s => s.id === targetSession.id);

    sessions.splice(draggedIndex, 1);
    sessions.splice(targetIndex, 0, draggedSession);

    reorderChatSessions(sessions);
    setDraggedSession(null);
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
  };

  return (
    <>
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">Chats</div>
          <button className="sidebar-new-btn" onClick={handleNewSession} title="New chat">
            +
          </button>
        </div>

        <div className="sidebar-content">
          {chatSessions.length === 0 ? (
            <div className="sidebar-empty">
              <p>No saved chats</p>
              <p className="sidebar-empty-hint">Create a new chat or save the current canvas</p>
            </div>
          ) : (
            <div className="sidebar-sessions">
              {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`sidebar-session ${
                      activeChatSession === session.id ? 'active' : ''
                    } ${draggedSession?.id === session.id ? 'dragging' : ''}`}
                    onClick={() => handleLoadSession(session)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, session)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, session)}
                    onDragEnd={handleDragEnd}
                  >
                    {editingSession === session.id ? (
                      <input
                        className="sidebar-session-edit"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRenameSession(session.id, editingName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameSession(session.id, editingName);
                          } else if (e.key === 'Escape') {
                            setEditingSession(null);
                            setEditingName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="sidebar-session-content">
                          <div className="sidebar-session-name">{session.name}</div>
                          <div className="sidebar-session-meta">
                            <span className="sidebar-session-time">
                              {formatTimestamp(session.timestamp)}
                            </span>
                            {session.nodes && session.nodes.length > 0 && (
                              <span className="sidebar-session-count">
                                {session.nodes.length} node{session.nodes.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="sidebar-session-actions">
                          <button
                            className="sidebar-session-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(session);
                            }}
                            title="Rename"
                          >
                            ✎
                          </button>
                          <button
                            className="sidebar-session-btn delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Delete this chat?')) {
                                deleteChatSession(session.id);
                              }
                            }}
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
