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
    archiveChatSession,
    reorderChatSessions,
    moveSessionToProject,
    setShowSettings,
    setShowUpgradePlan,
    addTab,
    // Projects
    projects,
    expandedProjects,
    addProject,
    updateProject,
    deleteProject,
    toggleProjectExpanded,
    setProjectExpanded,
  } = useStore();

  const [editingSession, setEditingSession] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [draggedSession, setDraggedSession] = useState(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, session: null });
  const [projectContextMenu, setProjectContextMenu] = useState({ visible: false, x: 0, y: 0, project: null });
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const menuDropdownRef = useRef(null);
  const contextMenuRef = useRef(null);
  const projectContextMenuRef = useRef(null);
  const newProjectInputRef = useRef(null);

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

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, session: null });
        setShowMoveSubmenu(false);
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible]);

  // Close project context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectContextMenuRef.current && !projectContextMenuRef.current.contains(event.target)) {
        setProjectContextMenu({ visible: false, x: 0, y: 0, project: null });
      }
    };

    if (projectContextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [projectContextMenu.visible]);

  // Focus new project input when creating
  useEffect(() => {
    if (creatingProject && newProjectInputRef.current) {
      newProjectInputRef.current.focus();
    }
  }, [creatingProject]);

  const handleContextMenu = (e, session) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      session: session
    });
    setShowMoveSubmenu(false);
  };

  const handleProjectContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      project: project
    });
  };

  const handleOpenInNewWindow = async (session) => {
    setContextMenu({ visible: false, x: 0, y: 0, session: null });
    if (window.electronAPI?.window?.openChatWindow) {
      await window.electronAPI.window.openChatWindow(session.id, session.name);
    }
  };

  const handleOpenInTab = (session) => {
    setContextMenu({ visible: false, x: 0, y: 0, session: null });
    // Pass the session's nodes and edges to the tab so it maintains independent state
    addTab(session.id, session.name, session.nodes || [], session.edges || []);
    handleLoadSession(session);
    // Auto-close sidebar when opening a new tab
    setSidebarOpen(false);
  };

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
      projectId: null,
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

  // Project handlers
  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      const project = {
        id: `project-${Date.now()}`,
        name: newProjectName.trim(),
        timestamp: Date.now(),
      };
      addProject(project);
      setProjectExpanded(project.id, true);
      setNewProjectName('');
      setCreatingProject(false);
    } else {
      setCreatingProject(false);
    }
  };

  const handleRenameProject = (projectId, newName) => {
    updateProject(projectId, { name: newName });
    setEditingProject(null);
    setEditingProjectName('');
  };

  const startEditingProject = (project) => {
    setEditingProject(project.id);
    setEditingProjectName(project.name);
    setProjectContextMenu({ visible: false, x: 0, y: 0, project: null });
  };

  const handleDeleteProject = (projectId) => {
    if (window.confirm('Delete this project? Chats will be moved to "Your chats".')) {
      deleteProject(projectId);
    }
    setProjectContextMenu({ visible: false, x: 0, y: 0, project: null });
  };

  const handleMoveToProject = (sessionId, projectId) => {
    moveSessionToProject(sessionId, projectId);
    setContextMenu({ visible: false, x: 0, y: 0, session: null });
    setShowMoveSubmenu(false);
    // Expand the target project so user can see the moved session
    if (projectId) {
      setProjectExpanded(projectId, true);
    }
  };

  const handleMoveToNewProject = (sessionId) => {
    // Create a new project and move the session to it
    const project = {
      id: `project-${Date.now()}`,
      name: `Project ${projects.length + 1}`,
      timestamp: Date.now(),
    };
    addProject(project);
    moveSessionToProject(sessionId, project.id);
    setProjectExpanded(project.id, true);
    setContextMenu({ visible: false, x: 0, y: 0, session: null });
    setShowMoveSubmenu(false);
    // Start editing the project name immediately
    setEditingProject(project.id);
    setEditingProjectName(project.name);
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

  const handleDropOnProject = (e, projectId) => {
    e.preventDefault();
    if (draggedSession) {
      moveSessionToProject(draggedSession.id, projectId);
      setProjectExpanded(projectId, true);
      setDraggedSession(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
  };

  // Filter sessions
  const sessionsInProjects = chatSessions.filter(s => s.projectId);
  const sessionsWithoutProject = chatSessions.filter(s => !s.projectId);

  // Render a session item
  const renderSessionItem = (session) => (
    <div
      key={session.id}
      className={`sidebar-session ${
        activeChatSession === session.id ? 'active' : ''
      } ${draggedSession?.id === session.id ? 'dragging' : ''}`}
      onClick={() => handleLoadSession(session)}
      onContextMenu={(e) => handleContextMenu(e, session)}
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
        <div className="sidebar-session-content">
          <div className="sidebar-session-name">{session.name}</div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          {/* Projects Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-label">Projects</span>
              <button
                className="sidebar-section-btn"
                onClick={() => setCreatingProject(true)}
                title="New project"
              >
                +
              </button>
            </div>

            {/* New project input */}
            {creatingProject && (
              <div className="sidebar-project" style={{ padding: '4px 12px' }}>
                <span className="sidebar-project-icon">📁</span>
                <input
                  ref={newProjectInputRef}
                  className="sidebar-project-edit"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onBlur={handleCreateProject}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateProject();
                    } else if (e.key === 'Escape') {
                      setCreatingProject(false);
                      setNewProjectName('');
                    }
                  }}
                  placeholder="Project name..."
                />
              </div>
            )}

            {/* Project list */}
            {projects.map((project) => {
              const projectSessions = chatSessions.filter(s => s.projectId === project.id);
              const isExpanded = expandedProjects[project.id];

              return (
                <div key={project.id}>
                  <div
                    className={`sidebar-project ${isExpanded ? 'active' : ''}`}
                    onClick={() => toggleProjectExpanded(project.id)}
                    onContextMenu={(e) => handleProjectContextMenu(e, project)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnProject(e, project.id)}
                  >
                    <span className={`sidebar-project-expand ${isExpanded ? 'expanded' : ''}`}>
                      ▶
                    </span>
                    <span className="sidebar-project-icon">📁</span>
                    {editingProject === project.id ? (
                      <input
                        className="sidebar-project-edit"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onBlur={() => handleRenameProject(project.id, editingProjectName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameProject(project.id, editingProjectName);
                          } else if (e.key === 'Escape') {
                            setEditingProject(null);
                            setEditingProjectName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <span className="sidebar-project-name">{project.name}</span>
                    )}
                  </div>
                  {isExpanded && projectSessions.length > 0 && (
                    <div className="sidebar-project-sessions">
                      {projectSessions.map(renderSessionItem)}
                    </div>
                  )}
                </div>
              );
            })}

          </div>

          {/* Your Chats Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-label">Chat</span>
              <button
                className="sidebar-section-btn"
                onClick={handleNewSession}
                title="New chat"
              >
                +
              </button>
            </div>

            <div className="sidebar-sessions">
              {sessionsWithoutProject.map(renderSessionItem)}
            </div>
          </div>
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

      {/* Session Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="sidebar-context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 10000
          }}
        >
          <button
            className="sidebar-context-menu-item"
            onClick={() => handleOpenInTab(contextMenu.session)}
          >
            Open in tab
          </button>
          <button
            className="sidebar-context-menu-item"
            onClick={() => handleOpenInNewWindow(contextMenu.session)}
          >
            Open in new window
          </button>
          <button
            className="sidebar-context-menu-item"
            onClick={() => {
              startEditing(contextMenu.session);
              setContextMenu({ visible: false, x: 0, y: 0, session: null });
            }}
          >
            Rename
          </button>
          <div className="sidebar-context-menu-divider"></div>

          {/* Move to project submenu */}
          <div
            className="sidebar-context-menu-item-with-submenu"
            onMouseEnter={() => setShowMoveSubmenu(true)}
            onMouseLeave={() => setShowMoveSubmenu(false)}
          >
            <button>
              <span>Move to project</span>
              <span className="submenu-arrow">▶</span>
            </button>
            {showMoveSubmenu && (
              <div className="sidebar-context-submenu">
                <button
                  className="sidebar-context-submenu-item"
                  onClick={() => handleMoveToNewProject(contextMenu.session.id)}
                >
                  <span className="folder-icon">+</span>
                  <span>New project</span>
                </button>
                {projects.length > 0 && (
                  <div className="sidebar-context-submenu-divider"></div>
                )}
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className="sidebar-context-submenu-item"
                    onClick={() => handleMoveToProject(contextMenu.session.id, project.id)}
                  >
                    <span className="folder-icon">📁</span>
                    <span>{project.name}</span>
                  </button>
                ))}
                {contextMenu.session?.projectId && (
                  <>
                    <div className="sidebar-context-submenu-divider"></div>
                    <button
                      className="sidebar-context-submenu-item"
                      onClick={() => handleMoveToProject(contextMenu.session.id, null)}
                    >
                      <span className="folder-icon">↩</span>
                      <span>Remove from project</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="sidebar-context-menu-divider"></div>
          <button
            className="sidebar-context-menu-item danger"
            onClick={() => {
              archiveChatSession(contextMenu.session.id);
              setContextMenu({ visible: false, x: 0, y: 0, session: null });
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Project Context Menu */}
      {projectContextMenu.visible && (
        <div
          ref={projectContextMenuRef}
          className="sidebar-context-menu"
          style={{
            position: 'fixed',
            top: projectContextMenu.y,
            left: projectContextMenu.x,
            zIndex: 10000
          }}
        >
          <button
            className="sidebar-context-menu-item"
            onClick={() => startEditingProject(projectContextMenu.project)}
          >
            Rename
          </button>
          <div className="sidebar-context-menu-divider"></div>
          <button
            className="sidebar-context-menu-item danger"
            onClick={() => handleDeleteProject(projectContextMenu.project.id)}
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}

export default Sidebar;
