import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';

function Sidebar({ nodes, onLoadSession, onSaveSession, onNewSession, onNewChatWithMode }) {
  // Get user profile from localStorage
  const [userFullName, setUserFullName] = useState(() => localStorage.getItem('userFullName') || '');
  const [userDisplayName, setUserDisplayName] = useState(() => localStorage.getItem('userDisplayName') || '');

  // Listen for storage changes (when settings are saved)
  useEffect(() => {
    const handleStorageChange = () => {
      setUserFullName(localStorage.getItem('userFullName') || '');
      setUserDisplayName(localStorage.getItem('userDisplayName') || '');
    };

    window.addEventListener('storage', handleStorageChange);
    // Also check periodically for same-tab updates
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
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
    setShowSettings,
    setShowUpgradePlan,
  } = useStore();

  const [editingSession, setEditingSession] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [draggedSession, setDraggedSession] = useState(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const menuDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target)) {
        setShowMenuDropdown(false);
      }
    };

    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenuDropdown]);

  const handleNewSession = () => {
    const sessionId = `session-${Date.now()}`;
    const nodeId = `chat-${Date.now()}`;

    // Create the initial node
    const initialNode = {
      id: nodeId,
      type: 'chat',
      position: { x: 200, y: 200 },
      style: { width: 300, height: 375 },
      data: {
        messages: [],
        provider: 'claude',
        model: null,
        branchFrom: null,
        branchMetadata: null,
      },
    };

    // Create session with node included
    const newSession = {
      id: sessionId,
      name: `Chat ${chatSessions.length + 1}`,
      timestamp: Date.now(),
      nodes: [initialNode],
      edges: [],
    };

    addChatSession(newSession);
    setActiveChatSession(sessionId);
    if (onNewSession) onNewSession(newSession);

    // Close settings if open
    setShowSettings(false);

    // Set the node on canvas and enter chat mode
    if (onNewChatWithMode) {
      onNewChatWithMode(nodeId, initialNode);
    }
  };


  const handleLoadSession = (session) => {
    setActiveChatSession(session.id);
    setShowSettings(false); // Close settings when switching to a chat
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
          <div className="sidebar-title">Chat</div>
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

        <div
          className="sidebar-footer"
          ref={menuDropdownRef}
          onClick={() => setShowMenuDropdown(!showMenuDropdown)}
          title="Menu"
          style={{ cursor: 'pointer' }}
        >
          <div className="sidebar-settings-btn">
            <div className="sidebar-user-avatar">
              {userFullName ? userFullName.charAt(0).toUpperCase() : 'T'}
            </div>
            <span>{userDisplayName || userFullName || 'Settings'}</span>
          </div>
          {showMenuDropdown && (
            <div className="sidebar-menu-dropdown">
              <button
                className="sidebar-dropdown-item"
                onClick={() => {
                  setShowMenuDropdown(false);
                  setShowSettings(true);
                }}
              >
                <span>Settings</span>
              </button>
              <button
                className="sidebar-dropdown-item"
                onClick={() => {
                  setShowMenuDropdown(false);
                  window.open('mailto:hi@dotenv.id', '_blank');
                }}
              >
                <span>Get help</span>
              </button>
              <div className="sidebar-dropdown-divider"></div>
              <button
                className="sidebar-dropdown-item"
                onClick={() => {
                  setShowMenuDropdown(false);
                  setShowUpgradePlan(true);
                }}
              >
                <span>Upgrade plan</span>
              </button>
              <button
                className="sidebar-dropdown-item"
                onClick={() => {
                  setShowMenuDropdown(false);
                  console.log('Learn more');
                }}
              >
                <span>Learn more</span>
              </button>
              <div className="sidebar-dropdown-divider"></div>
              <button
                className="sidebar-dropdown-item danger"
                onClick={() => {
                  setShowMenuDropdown(false);
                  console.log('Logout');
                }}
              >
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
