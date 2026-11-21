import React, { useState, useRef, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { NodeContext } from '../App';
import { useStore, useProviders, processConversation, executeTool } from '../store';
import MarkdownMessage from './MarkdownMessage';
import { ToolResultCompact, ToolCallCompact } from './ToolCompact';
import { ToolGroup, groupToolCalls } from './ToolGroup';
import { TaskBlock } from './TaskBlock';
import { ToolConfirmationModal } from './ToolConfirmationModal';
import { CliPermissionModal } from './CliPermissionModal';
import PixelLoader from './PixelLoader';
import ConnectorsOverlay from './ConnectorsOverlay';
import ChecklistOverlay from './ChecklistOverlay';
import VMOverlay from './VMOverlay';
import CommandPalette from './CommandPalette';
import { useSlashCommands } from '../hooks/useSlashCommands';
import { useStreamingMessages } from '../hooks/useStreamingMessages';
import { findCommand } from '../lib/slashCommands';

function ChatMode({ nodeId, onExit, isChatWindow = false }) {
  const PROVIDERS = useProviders();
  const { updateNodeData, getConnectedContext, nodes, addChatNode } = useContext(NodeContext);
  const {
    apiKeys,
    sidebarOpen,
    setSidebarOpen,
    setChatMode,
    getConversation,
    updateConversation,
    setConversationMessages,
    setConversationLoading,
    selectedModels,
    conversationQueue,
    browserMode,
    setBrowserMode,
    chatPanelWidth,
    chatPanelCollapsed,
    planningMode,
    setPlanningMode,
    pendingConfirmation,
    setPendingConfirmation,
    pendingCliPermission,
    cliStreamingContent,
    messageQueue,
    queueMessage,
    openFileInViewer,
    showChecklistPanel,
    setShowChecklistPanel,
    pendingVMSelection,
    setPendingVMSelection,
    runningVMs,
    chatSessions,
    addChatSession,
    setActiveChatSession,
  } = useStore();

  const node = nodes.find(n => n.id === nodeId);
  const activeChatSession = useStore(state => state.activeChatSession);
  const convKey = `${activeChatSession || '_default'}::${nodeId}`;
  const conversation = useStore(state => state.conversations[convKey]) || getConversation(nodeId);
  const messages = conversation.messages;
  const isLoading = conversation.isLoading;
  const provider = conversation.provider || node?.data?.provider || 'claude';
  const model = conversation.model || node?.data?.model || null;

  const [input, setInput] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showConnectorsDropdown, setShowConnectorsDropdown] = useState(false);
  const slashCommands = useSlashCommands(null);
  const streaming = useStreamingMessages(nodeId);
  const autoScrollRef = useRef(true);
  const messagesContainerRef = useRef(null);
  const [showVMDropdown, setShowVMDropdown] = useState(false);
  const [showConnectorsOverlay, setShowConnectorsOverlay] = useState(false);
  const [showVMOverlay, setShowVMOverlay] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [modelFilter, setModelFilter] = useState('cloud');
  const [userDisplayName, setUserDisplayName] = useState(() => localStorage.getItem('userDisplayName') || '');
  const [attachments, setAttachments] = useState([]); // Array of { id, type, name, data, preview }

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const isMountedRef = useRef(true);
  const modelDropdownRef = useRef(null);
  const connectorsDropdownRef = useRef(null);
  const vmDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Listen for display name changes
  useEffect(() => {
    const handleProfileUpdate = () => {
      setUserDisplayName(localStorage.getItem('userDisplayName') || '');
    };
    window.addEventListener('storage', handleProfileUpdate);
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('storage', handleProfileUpdate);
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  // Initialize conversation in store if not present
  useEffect(() => {
    const state = useStore.getState();
    const storeConv = state.conversations[state._convKey(nodeId)];
    if (!storeConv && node) {
      updateConversation(nodeId, {
        messages: node.data?.messages || [],
        isLoading: false,
        provider: node.data?.provider || 'claude',
        model: node.data?.model || null
      });
    }
  }, [nodeId, node, activeChatSession]);

  useEffect(() => {
    // Scroll to bottom on mount or when messages change
    // Use 'auto' for instant scroll without animation
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Sync node data when conversation changes
  useEffect(() => {
    if (node) {
      updateNodeData(nodeId, { messages, provider, model });
    }
  }, [messages, provider, model, nodeId, updateNodeData, node]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setShowModelDropdown(false);
      }
      if (connectorsDropdownRef.current && !connectorsDropdownRef.current.contains(event.target)) {
        setShowConnectorsDropdown(false);
      }
      if (vmDropdownRef.current && !vmDropdownRef.current.contains(event.target)) {
        setShowVMDropdown(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    if (showModelDropdown || showConnectorsDropdown || showVMDropdown || showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelDropdown, showConnectorsDropdown, showVMDropdown, showMoreMenu]);

  // Auto-open VM dropdown when AI requests a VM selection
  useEffect(() => {
    if (pendingVMSelection) {
      setShowVMDropdown(true);
    }
  }, [pendingVMSelection]);

  const handleVMSelect = (os) => {
    setShowVMDropdown(false);
    if (pendingVMSelection && pendingVMSelection.resolve) {
      // AI-triggered: resolve the pending Promise so executeTool continues
      pendingVMSelection.resolve(os);
      setPendingVMSelection(null);
    } else {
      // Manual click: open the VM overlay to check status / install / launch
      setShowVMOverlay(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    // If no active session, create one now (first message from welcome screen)
    if (!activeChatSession) {
      const sessionId = `session-${Date.now()}`;
      const currentNode = nodes.find(n => n.id === nodeId);
      const newSession = {
        id: sessionId,
        name: `Chat ${chatSessions.length + 1}`,
        timestamp: Date.now(),
        nodes: currentNode ? [currentNode] : [],
        edges: [],
        projectId: null,
      };
      addChatSession(newSession);
      setActiveChatSession(sessionId);
    }

    // ═══ Fallback slash command detection ═══
    // If the palette didn't intercept (e.g. user typed fast + Enter),
    // catch bare slash commands here before they go to the AI.
    const trimmed = input.trim();
    if (trimmed.startsWith('/') && !trimmed.includes(' ')) {
      const cmdName = trimmed.slice(1).toLowerCase();
      const allCmds = slashCommands.filteredCommands;
      const cmd = findCommand(allCmds, cmdName);
      if (cmd) {
        executeSlashCommand(cmd);
        return;
      }
      // Unrecognized slash command — don't send to PTY, ignore silently
      if (cmdName.length > 0) {
        addSystemMsg(`*Unknown command: \`/${cmdName}\`*`);
        setInput('');
        return;
      }
    }

    // Build user message with attachments if present
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    // Add attachments to message if present
    if (attachments.length > 0) {
      userMessage.attachments = attachments.map(att => ({
        type: att.type,
        mimeType: att.mimeType,
        name: att.name,
        data: att.data, // base64 data URL
      }));
    }

    setInput('');
    setAttachments([]); // Clear attachments after sending
    setConversationLoading(nodeId, true);

    // Get the LATEST provider and model from store directly
    const freshState = useStore.getState();
    const freshConversation = freshState.conversations[freshState._convKey(nodeId)];
    const freshProvider = freshConversation?.provider || node?.data?.provider || 'claude';
    const freshModel = freshConversation?.model || node?.data?.model || null;

    const context = getConnectedContext(nodeId);

    // Process conversation in background - it will continue even if chat mode is closed
    processConversation(
      nodeId,
      userMessage,
      messages,
      freshProvider,
      freshModel,
      context,
      updateNodeData
    );
  };

  const handleStop = () => {
    const state = useStore.getState();
    const queueState = conversationQueue[state._convKey(nodeId)];
    if (queueState?.abort) {
      queueState.abort();
    }
    setConversationLoading(nodeId, false);
  };

  // Helper: append a system-style result message instantly (no AI call)
  const addSystemMsg = (content) => {
    const msg = { id: `sys-${Date.now()}`, role: 'assistant', content };
    const updated = [...messages, msg];
    setConversationMessages(nodeId, updated);
    updateNodeData(nodeId, { messages: updated });
  };

  const executeSlashCommand = (cmd) => {
    setInput('');
    slashCommands.close();
    const name = cmd.name;
    const category = cmd.category || 'fire';

    // ═══ LOCAL commands — handled entirely by app UI ═══
    if (category === 'local' || name === 'clear') {
      if (name === 'clear') {
        setConversationMessages(nodeId, []);
        updateNodeData(nodeId, { messages: [] });
        streaming.setMessages([]);
      }
      if (name === 'compact') {
        const kept = messages.slice(-4);
        const summary = { id: `compact-${Date.now()}`, role: 'assistant', content: `*Context compacted — kept last ${kept.length} messages, cleared ${messages.length - kept.length} older messages.*` };
        setConversationMessages(nodeId, [...kept, summary]);
        updateNodeData(nodeId, { messages: [...kept, summary] });
      }
      return;
    }

    // ═══ INTERACTIVE commands — app owns the UI (modal) ═══
    if (category === 'interactive') {
      if (name === 'model') { setShowModelDropdown(true); return; }
      if (name === 'mcp') { setShowConnectorsOverlay(true); return; }
      return;
    }

    // ═══ Unknown command ═══
    addSystemMsg(`*Unknown command: \`/${name}\`*`);
  };

  const handleKeyDown = (e) => {
    // Slash command menu takes priority
    const result = slashCommands.handleKeyDown(e);
    if (result.consumed) {
      if (result.command) executeSlashCommand(result.command);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleModelSelect = (modelId) => {
    // Find which provider this model belongs to
    let selectedProvider = 'cloud'; // default for OpenRouter models

    // Check if it's in PROVIDERS
    for (const [providerId, prov] of Object.entries(PROVIDERS)) {
      if (prov.models.find(m => m.id === modelId)) {
        selectedProvider = providerId;
        break;
      }
    }

    // Check if it's a custom selected model (OpenRouter format)
    if (selectedModels?.find(m => m.id === modelId)) {
      // Extract provider from model ID (e.g., "anthropic/claude-opus-4.5" -> "claude")
      const providerMap = {
        'anthropic': 'claude',
        'openai': 'openai',
        'google': 'gemini',
        'x-ai': 'grok',
      };
      const prefix = modelId.split('/')[0];
      selectedProvider = providerMap[prefix] || 'claude';
    }

    // Update conversation with both model AND provider
    updateConversation(nodeId, { model: modelId, provider: selectedProvider });
    updateNodeData(nodeId, { model: modelId, provider: selectedProvider });
    setShowModelDropdown(false);
  };

  const getCurrentModelName = () => {
    if (!model) return 'Select Model';

    // Check custom selected models first
    const customModel = selectedModels?.find(m => m.id === model);
    if (customModel) return customModel.name;

    for (const [providerId, prov] of Object.entries(PROVIDERS)) {
      const foundModel = prov.models.find(m => m.id === model);
      if (foundModel) return foundModel.name;
    }
    return 'Select Model';
  };

  // File handling functions
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const processFiles = async (files) => {
    const newAttachments = [];

    for (const file of files) {
      const fileType = file.type.split('/')[0]; // 'image', 'video', 'application', etc.

      // Read file as base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      const attachment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: fileType,
        mimeType: file.type,
        name: file.name,
        size: file.size,
        data: base64, // Full data URL (includes mime type prefix)
      };

      // Create preview for images
      if (fileType === 'image') {
        attachment.preview = base64;
      } else if (fileType === 'video') {
        attachment.preview = await createVideoThumbnail(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const createVideoThumbnail = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      video.preload = 'metadata';

      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const removeAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
    setShowConnectorsDropdown(false);
  };

  const handleBranch = (messageIndex) => {
    // Generate unique branch ID and color
    const branchId = `branch-${Date.now()}`;
    const branchColor = `hsl(${Math.random() * 360}, 70%, 60%)`;

    // Create new node with messages up to this point (without branch markers on the new node)
    // Strip any branchMarker properties from messages to prevent them from carrying forward
    const branchMessages = messages.slice(0, messageIndex + 1).map(msg => {
      const { branchMarker, ...msgWithoutMarker } = msg;
      return msgWithoutMarker;
    });

    // Mark the original message with branch marker (only in the origin node)
    const updatedMessages = messages.map((msg, idx) =>
      idx === messageIndex
        ? { ...msg, branchMarker: { branchId, color: branchColor, isOrigin: true } }
        : msg
    );
    console.log("🌿🌿🌿 BRANCH from ChatMode!!!"); updateNodeData(nodeId, { messages: updatedMessages }); setConversationMessages(nodeId, updatedMessages);

    // Exit chat mode first
    onExit();

    // Create new node on canvas with branched messages
    const newNodeId = addChatNode(
      { x: 400, y: 200 },
      nodeId,
      branchMessages,
      { branchId, color: branchColor, branchedFromMessageIndex: messageIndex }
    );
  };

  if (!node) {
    return null;
  }

  const modelName = PROVIDERS[provider]?.models.find(m => m.id === model)?.name || model;

  return (
    <div
      className={`chat-mode-overlay ${sidebarOpen && !isChatWindow ? 'sidebar-open' : ''} ${browserMode ? 'browser-mode' : ''} ${messages.length === 0 ? 'chat-mode-welcome' : ''} ${isChatWindow ? 'chat-window-mode' : ''}`}
      style={browserMode ? { width: chatPanelWidth, transform: chatPanelCollapsed ? `translateX(${chatPanelWidth}px)` : 'translateX(0)' } : undefined}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*,.pdf,.txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.h,.hpp"
        multiple
        style={{ display: 'none' }}
      />
      {isChatWindow && (
        <div className="chat-window-drag-region" />
      )}
      {messages.length === 0 ? (
        <div className="chat-mode-welcome-screen">
          {userDisplayName && (
            <h1 className="chat-mode-welcome-heading">Hi {userDisplayName}!</h1>
          )}
          <div className="chat-mode-input-wrapper chat-mode-input-centered">
            {slashCommands.isOpen && (
              <CommandPalette
                commands={slashCommands.filteredCommands}
                selectedIndex={slashCommands.selectedIndex}
                onSelect={(index) => {
                  const cmd = slashCommands.selectCommand(index);
                  if (cmd) { executeSlashCommand(cmd); textareaRef.current?.focus(); }
                }}
                menuRef={slashCommands.menuRef}
              />
            )}
            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="chat-mode-attachments">
                {attachments.map(att => (
                  <div key={att.id} className="attachment-preview">
                    {att.type === 'image' && att.preview && (
                      <img src={att.preview} alt={att.name} />
                    )}
                    {att.type === 'video' && (
                      <div className="video-preview">
                        {att.preview ? <img src={att.preview} alt={att.name} /> : <span>🎬</span>}
                      </div>
                    )}
                    {att.type !== 'image' && att.type !== 'video' && (
                      <div className="file-preview">
                        <span className="file-icon">📄</span>
                        <span className="file-name">{att.name}</span>
                      </div>
                    )}
                    <button className="remove-attachment" onClick={() => removeAttachment(att.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); slashCommands.handleInputChange(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
            />
            <div className="chat-mode-button-bar">
              <div className="chat-mode-left-buttons">
                <div className="chat-mode-connectors-dropdown-container" ref={connectorsDropdownRef}>
                  <button
                    className="chat-mode-left-btn"
                    title="Add file, connectors and more /"
                    onClick={() => setShowConnectorsDropdown(!showConnectorsDropdown)}
                  >
                    +
                  </button>
                  {showConnectorsDropdown && (
                    <div className="chat-mode-connectors-dropdown">
                      <button className="connector-option" onClick={openFileDialog}>
                        Add photos and files
                      </button>
                      <button className="connector-option" onClick={() => {
                        setShowConnectorsDropdown(false);
                        setShowConnectorsOverlay(true);
                      }}>
                        Connectors
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className={`chat-mode-plan-btn ${planningMode ? 'active' : ''}`}
                  onClick={() => setPlanningMode(!planningMode)}
                  title={planningMode ? "Disable planning mode" : "Enable planning mode"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <path d="M9 12h6"/>
                    <path d="M9 16h6"/>
                  </svg>
                </button>
              </div>
              <div className="chat-mode-model-dropdown-container" ref={modelDropdownRef}>
                <button
                  className="chat-mode-model-dropdown-btn"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  title="Select Model"
                >
                  {getCurrentModelName()}
                </button>
                {showModelDropdown && (
                  <div className="chat-mode-model-dropdown">
                    <div className="model-filter-toggle">
                      <button
                        className={`filter-btn ${modelFilter === 'cloud' ? 'active' : ''}`}
                        onClick={() => setModelFilter('cloud')}
                      >
                        Cloud
                      </button>
                      <button
                        className={`filter-btn ${modelFilter === 'local' ? 'active' : ''}`}
                        onClick={() => setModelFilter('local')}
                      >
                        Local
                      </button>
                    </div>

                    {/* User's custom selected models (only show in cloud mode) */}
                    {modelFilter === 'cloud' && selectedModels && selectedModels.length > 0 && (
                      <div className="model-group custom-models">
                        <div className="model-group-label">My Models</div>
                        {selectedModels.map((m) => (
                          <button
                            key={m.id}
                            className={`model-option ${model === m.id ? 'active' : ''}`}
                            onClick={() => handleModelSelect(m.id)}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {Object.entries(PROVIDERS)
                      .filter(([key, prov]) => prov.type === modelFilter)
                      .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999))
                      .map(([providerId, prov]) => (
                        <div key={providerId} className="model-group">
                          <div className="model-group-label">{prov.name}</div>
                          {prov.models.map((m) => (
                            <button
                              key={m.id}
                              className={`model-option ${model === m.id ? 'active' : ''}`}
                              onClick={() => handleModelSelect(m.id)}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="chat-mode-vm-dropdown-container" ref={vmDropdownRef}>
                <button
                  className="chat-mode-vm-btn"
                  onClick={() => setShowVMOverlay(true)}
                  title="Open in VM"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </button>
                {showVMDropdown && (
                  <div className="chat-mode-vm-dropdown">
                    <button className="vm-option" onClick={() => handleVMSelect('macos')} title="macOS">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </button>
                    <button className="vm-option" onClick={() => handleVMSelect('linux')} title="Linux">
                      <svg width="20" height="20" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>
                        <path fill="currentColor" d="M173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>
                      </svg>
                    </button>
                    <button className="vm-option" onClick={() => handleVMSelect('windows')} title="Windows">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="2" y="2" width="9.25" height="9.25" />
                        <rect x="12.75" y="2" width="9.25" height="9.25" />
                        <rect x="2" y="12.75" width="9.25" height="9.25" />
                        <rect x="12.75" y="12.75" width="9.25" height="9.25" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {isLoading && (
                <button className="chat-mode-stop-btn" onClick={handleStop} title="Stop response">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
              )}
              <button className="chat-mode-send-btn" onClick={handleSend} disabled={!input.trim()}>
                <svg width="18" height="18" viewBox="0 0 512 512" fill="none" stroke="#999" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M112 244l144-144 144 144M256 120v292"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {!isChatWindow && (
            <div className="chat-mode-more-container" ref={moreMenuRef}>
              <button className="chat-mode-more-btn" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5"/>
                  <circle cx="8" cy="8" r="1.5"/>
                  <circle cx="8" cy="13" r="1.5"/>
                </svg>
              </button>
              {showMoreMenu && (
                <div className="chat-mode-more-dropdown">
                  <button className="chat-mode-more-option" onClick={() => { setShowMoreMenu(false); setBrowserMode(false); onExit(); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    Canvas mode
                  </button>
                  <button className="chat-mode-more-option" onClick={() => { setShowMoreMenu(false); setSidebarOpen(false); setBrowserMode(true); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    Open in Browser
                  </button>
                  <button className="chat-mode-more-option" onClick={() => {
                    setShowMoreMenu(false);
                    // Find last written file from conversation messages (tool calls)
                    let lastFile = null;
                    for (const msg of messages) {
                      // Check OpenRouter/Ollama tool calls (write_file)
                      if (msg.toolCalls) {
                        for (const tc of msg.toolCalls) {
                          if (tc.name === 'write_file' && tc.input?.path) lastFile = tc.input.path;
                          if (tc.name === 'Write' && tc.input?.file_path) lastFile = tc.input.file_path;
                        }
                      }
                      // Check CLI streamed tool results
                      if (msg.toolResults) {
                        for (const tr of msg.toolResults) {
                          if (tr.name === 'Write' && tr.input?.file_path) lastFile = tr.input.file_path;
                          if (tr.name === 'write_file' && tr.input?.path) lastFile = tr.input.path;
                        }
                      }
                    }
                    // Also check streaming content
                    const streaming = cliStreamingContent[nodeId];
                    if (streaming?.lastWrittenFile) lastFile = streaming.lastWrittenFile;
                    if (lastFile) {
                      openFileInViewer(lastFile);
                    }
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Open in Viewer
                  </button>
                  <button className="chat-mode-more-option" onClick={() => { setShowChecklistPanel(!showChecklistPanel); setShowMoreMenu(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    {showChecklistPanel ? 'Hide Checklist' : 'Checklist'}
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="chat-mode-content">
            <div className="chat-mode-messages">
              {messages.filter(msg => !msg.hidden && !msg.isTerminal).map((msg, index) => (
              msg.isToolResult ? (
                <div key={msg.id} className="tool-result-container">
                  <div className="tool-compact-list">
                    {msg.toolResults.map((tr, i) => (
                      <ToolResultCompact key={i} tr={tr} />
                    ))}
                  </div>
                </div>
              ) : msg.role === 'user' ? (
                <div key={msg.id} className={`user-message-container ${msg.branchMarker ? 'has-branch-marker' : ''}`}>
                  {msg.branchMarker && (
                    <div
                      className="branch-marker"
                      style={{ backgroundColor: msg.branchMarker.color }}
                      title={`Branch point: ${msg.branchMarker.branchId}`}
                    >
                      <span className="branch-marker-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 8C6.88071 8 8 6.88071 8 5.5C8 4.11929 6.88071 3 5.5 3C4.11929 3 3 4.11929 3 5.5C3 6.88071 4.11929 8 5.5 8ZM5.5 8V16M5.5 16C4.11929 16 3 17.1193 3 18.5C3 19.8807 4.11929 21 5.5 21C6.88071 21 8 19.8807 8 18.5C8 17.1193 6.88071 16 5.5 16ZM18.5 8C19.8807 8 21 6.88071 21 5.5C21 4.11929 19.8807 3 18.5 3C17.1193 3 16 4.11929 16 5.5C16 6.88071 17.1193 8 18.5 8ZM18.5 8C18.5 8.92997 18.5 9.39496 18.3978 9.77646C18.1204 10.8117 17.3117 11.6204 16.2765 11.8978C15.895 12 15.43 12 14.5 12H8.5C6.84315 12 5.5 13.3431 5.5 15"/></svg></span>
                    </div>
                  )}
                  <div className="user-message">
                    {/* Attachment thumbnails */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="message-attachments">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="message-attachment-thumb">
                            {att.type === 'image' && (
                              <img src={att.data} alt={att.name} />
                            )}
                            {att.type === 'video' && (
                              <div className="video-thumb">🎬</div>
                            )}
                            {att.type !== 'image' && att.type !== 'video' && (
                              <div className="file-thumb">
                                <span className="file-icon">📄</span>
                                <span className="file-name">{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="user-message-content">
                      <MarkdownMessage content={msg.content} />
                    </div>
                  </div>
                  <div className="user-message-actions">
                    <button
                      className="message-action-btn"
                      onClick={() => handleCopy(msg.content)}
                      title="Copy message"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/></svg>
                    </button>
                    <button
                      className="message-action-btn"
                      onClick={() => handleBranch(index)}
                      title="Branch from here"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 8C6.88071 8 8 6.88071 8 5.5C8 4.11929 6.88071 3 5.5 3C4.11929 3 3 4.11929 3 5.5C3 6.88071 4.11929 8 5.5 8ZM5.5 8V16M5.5 16C4.11929 16 3 17.1193 3 18.5C3 19.8807 4.11929 21 5.5 21C6.88071 21 8 19.8807 8 18.5C8 17.1193 6.88071 16 5.5 16ZM18.5 8C19.8807 8 21 6.88071 21 5.5C21 4.11929 19.8807 3 18.5 3C17.1193 3 16 4.11929 16 5.5C16 6.88071 17.1193 8 18.5 8ZM18.5 8C18.5 8.92997 18.5 9.39496 18.3978 9.77646C18.1204 10.8117 17.3117 11.6204 16.2765 11.8978C15.895 12 15.43 12 14.5 12H8.5C6.84315 12 5.5 13.3431 5.5 15"/></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className={`assistant-message-container ${msg.branchMarker ? 'has-branch-marker' : ''} ${msg.toolCalls ? 'has-tool-calls' : ''}`}>
                  {msg.branchMarker && (
                    <div
                      className="branch-marker"
                      style={{ backgroundColor: msg.branchMarker.color }}
                      title={`Branch point: ${msg.branchMarker.branchId}`}
                    >
                      <span className="branch-marker-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 8C6.88071 8 8 6.88071 8 5.5C8 4.11929 6.88071 3 5.5 3C4.11929 3 3 4.11929 3 5.5C3 6.88071 4.11929 8 5.5 8ZM5.5 8V16M5.5 16C4.11929 16 3 17.1193 3 18.5C3 19.8807 4.11929 21 5.5 21C6.88071 21 8 19.8807 8 18.5C8 17.1193 6.88071 16 5.5 16ZM18.5 8C19.8807 8 21 6.88071 21 5.5C21 4.11929 19.8807 3 18.5 3C17.1193 3 16 4.11929 16 5.5C16 6.88071 17.1193 8 18.5 8ZM18.5 8C18.5 8.92997 18.5 9.39496 18.3978 9.77646C18.1204 10.8117 17.3117 11.6204 16.2765 11.8978C15.895 12 15.43 12 14.5 12H8.5C6.84315 12 5.5 13.3431 5.5 15"/></svg></span>
                    </div>
                  )}
                  <div className="assistant-message">
                    <div className="assistant-message-content">
                      {/* Reasoning/thinking display (planning mode or <planning> tags from CLI) */}
                      {(() => {
                        // Extract <planning> tags from content (CLI chatbot planning mode)
                        const planningMatch = msg.content?.match(/<planning>([\s\S]*?)<\/planning>/);
                        const reasoning = msg.reasoning || (planningMatch ? planningMatch[1].trim() : null);
                        const displayContent = planningMatch
                          ? msg.content.replace(/<planning>[\s\S]*?<\/planning>\s*/, '').trim()
                          : msg.content;
                        return (
                          <>
                            {reasoning && (
                              <details className="reasoning-block">
                                <summary className="reasoning-summary">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                                  </svg>
                                  Thinking
                                </summary>
                                <div className="reasoning-content">
                                  <MarkdownMessage content={reasoning} />
                                </div>
                              </details>
                            )}
                            {displayContent && <MarkdownMessage content={displayContent} />}
                          </>
                        );
                      })()}

                      {/* Tool calls display - compact style */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="tool-compact-list">
                          {msg.toolCalls.map((tc, i) => (
                            <ToolCallCompact key={i} tc={tc} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {!msg.toolCalls && (
                    <div className="assistant-message-actions">
                      <button
                        className="message-action-btn"
                        onClick={() => handleCopy(msg.content)}
                        title="Copy message"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/></svg>
                      </button>
                      <button
                        className="message-action-btn"
                        onClick={() => handleBranch(index)}
                        title="Branch from here"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 8C6.88071 8 8 6.88071 8 5.5C8 4.11929 6.88071 3 5.5 3C4.11929 3 3 4.11929 3 5.5C3 6.88071 4.11929 8 5.5 8ZM5.5 8V16M5.5 16C4.11929 16 3 17.1193 3 18.5C3 19.8807 4.11929 21 5.5 21C6.88071 21 8 19.8807 8 18.5C8 17.1193 6.88071 16 5.5 16ZM18.5 8C19.8807 8 21 6.88071 21 5.5C21 4.11929 19.8807 3 18.5 3C17.1193 3 16 4.11929 16 5.5C16 6.88071 17.1193 8 18.5 8ZM18.5 8C18.5 8.92997 18.5 9.39496 18.3978 9.77646C18.1204 10.8117 17.3117 11.6204 16.2765 11.8978C15.895 12 15.43 12 14.5 12H8.5C6.84315 12 5.5 13.3431 5.5 15"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            ))}
            {/* PTY streaming messages — user bubbles + assistant text */}
            {streaming.messages.map((msg) => (
              msg.role === 'user' ? (
                <div key={msg.id} className="user-message-container">
                  <div className="user-message">
                    <div className="user-message-content">
                      <MarkdownMessage content={msg.content} />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="assistant-message-container">
                  <div className="assistant-message">
                    <div className="assistant-message-content">
                      <MarkdownMessage content={msg.content} />
                    </div>
                  </div>
                </div>
              )
            ))}
            {/* Streaming messages from CLI — tool calls & results rendered live */}
            {isLoading && cliStreamingContent[nodeId]?.messages?.length > 0 && (
              cliStreamingContent[nodeId].messages.map((msg) => (
                msg.isToolResult ? (
                  <div key={msg.id} className="tool-result-container">
                    <div className="tool-compact-list">
                      {msg.toolResults.map((tr, i) => (
                        <ToolResultCompact key={i} tr={tr} />
                      ))}
                    </div>
                  </div>
                ) : msg.toolCalls ? (
                  <div key={msg.id} className="assistant-message-container has-tool-calls">
                    <div className="assistant-message">
                      <div className="assistant-message-content">
                        {msg.content && <MarkdownMessage content={msg.content} />}
                        <div className="tool-compact-list">
                          {msg.toolCalls.map((tc, i) => (
                            <ToolCallCompact key={i} tc={tc} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : msg.content ? (
                  <div key={msg.id} className="assistant-message-container">
                    <div className="assistant-message">
                      <div className="assistant-message-content">
                        <MarkdownMessage content={msg.content} />
                      </div>
                    </div>
                  </div>
                ) : null
              ))
            )}
            {isLoading && (() => {
              const cliStreaming = cliStreamingContent[nodeId];
              const hasStreamedText = cliStreaming?.messages?.some(m => m.role === 'assistant' && m.content && !m.toolCalls);
              const activity = cliStreaming?.activity;
              if (activity) {
                return (
                  <div className="message assistant loading">
                    <div className="cli-activity-indicator">
                      <PixelLoader />
                      <span className="cli-activity-text">{activity}</span>
                    </div>
                  </div>
                );
              }
              if (hasStreamedText) return null;
              return (
                <div className="message assistant loading">
                  <PixelLoader />
                </div>
              );
            })()}
            {/* PTY streaming indicator */}
            {streaming.isStreaming && (
              <div className="message assistant loading">
                <PixelLoader />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="chat-mode-input-wrapper" style={browserMode ? { width: chatPanelWidth, maxWidth: chatPanelWidth } : undefined}>
          {slashCommands.isOpen && (
            <CommandPalette
              commands={slashCommands.filteredCommands}
              selectedIndex={slashCommands.selectedIndex}
              onSelect={(index) => {
                const cmd = slashCommands.selectCommand(index);
                if (cmd) { executeSlashCommand(cmd); textareaRef.current?.focus(); }
              }}
              menuRef={slashCommands.menuRef}
            />
          )}
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="chat-mode-attachments">
              {attachments.map(att => (
                <div key={att.id} className="attachment-preview">
                  {att.type === 'image' && att.preview && (
                    <img src={att.preview} alt={att.name} />
                  )}
                  {att.type === 'video' && (
                    <div className="video-preview">
                      {att.preview ? <img src={att.preview} alt={att.name} /> : <span>🎬</span>}
                    </div>
                  )}
                  {att.type !== 'image' && att.type !== 'video' && (
                    <div className="file-preview">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{att.name}</span>
                    </div>
                  )}
                  <button className="remove-attachment" onClick={() => removeAttachment(att.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); slashCommands.handleInputChange(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
        />
        <div className="chat-mode-button-bar">
          <div className="chat-mode-left-buttons">
            <div className="chat-mode-connectors-dropdown-container" ref={connectorsDropdownRef}>
              <button
                className="chat-mode-left-btn"
                title="Add file, connectors and more /"
                onClick={() => setShowConnectorsDropdown(!showConnectorsDropdown)}
              >
                +
              </button>
              {showConnectorsDropdown && (
                <div className="chat-mode-connectors-dropdown">
                  <button className="connector-option" onClick={openFileDialog}>
                    Add photos and files
                  </button>
                  <button className="connector-option" onClick={() => {
                    setShowConnectorsDropdown(false);
                    setShowConnectorsOverlay(true);
                  }}>
                    Connectors
                  </button>
                </div>
              )}
            </div>
            <button
              className={`chat-mode-plan-btn ${planningMode ? 'active' : ''}`}
              onClick={() => setPlanningMode(!planningMode)}
              title={planningMode ? "Disable planning mode" : "Enable planning mode"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6"/>
                <path d="M9 16h6"/>
              </svg>
            </button>
          </div>
          <div className="chat-mode-model-dropdown-container" ref={modelDropdownRef}>
            <button
              className="chat-mode-model-dropdown-btn"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              title="Select Model"
            >
              {getCurrentModelName()}
            </button>
            {showModelDropdown && (
              <div className="chat-mode-model-dropdown">
                <div className="model-filter-toggle">
                  <button
                    className={`filter-btn ${modelFilter === 'cloud' ? 'active' : ''}`}
                    onClick={() => setModelFilter('cloud')}
                  >
                    Cloud
                  </button>
                  <button
                    className={`filter-btn ${modelFilter === 'local' ? 'active' : ''}`}
                    onClick={() => setModelFilter('local')}
                  >
                    Local
                  </button>
                </div>

                {/* User's custom selected models (only show in cloud mode) */}
                {modelFilter === 'cloud' && selectedModels && selectedModels.length > 0 && (
                  <div className="model-group custom-models">
                    <div className="model-group-label">My Models</div>
                    {selectedModels.map((m) => (
                      <button
                        key={m.id}
                        className={`model-option ${model === m.id ? 'active' : ''}`}
                        onClick={() => handleModelSelect(m.id)}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}

                {Object.entries(PROVIDERS)
                  .filter(([key, prov]) => prov.type === modelFilter)
                  .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999))
                  .map(([providerId, prov]) => (
                    <div key={providerId} className="model-group">
                      <div className="model-group-label">{prov.name}</div>
                      {prov.models.map((m) => (
                        <button
                          key={m.id}
                          className={`model-option ${model === m.id ? 'active' : ''}`}
                          onClick={() => handleModelSelect(m.id)}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="chat-mode-vm-dropdown-container" ref={vmDropdownRef}>
            <button
              className="chat-mode-vm-btn"
              onClick={() => setShowVMDropdown(!showVMDropdown)}
              title="Open in VM"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </button>
            {showVMDropdown && (
              <div className="chat-mode-vm-dropdown">
                <button className="vm-option" onClick={() => handleVMSelect('macos')} title="macOS">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </button>
                <button className="vm-option" onClick={() => handleVMSelect('linux')} title="Linux">
                  <svg width="20" height="20" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>
                        <path fill="currentColor" d="M173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>
                      </svg>
                </button>
                <button className="vm-option" onClick={() => handleVMSelect('windows')} title="Windows">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="2" width="9.25" height="9.25" />
                    <rect x="12.75" y="2" width="9.25" height="9.25" />
                    <rect x="2" y="12.75" width="9.25" height="9.25" />
                    <rect x="12.75" y="12.75" width="9.25" height="9.25" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {isLoading && (
            <button className="chat-mode-stop-btn" onClick={handleStop} title="Stop response">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          )}
          <button className="chat-mode-send-btn" onClick={handleSend} disabled={!input.trim()}>
            <svg width="18" height="18" viewBox="0 0 512 512" fill="none" stroke="#999" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round">
              <path d="M112 244l144-144 144 144M256 120v292"/>
            </svg>
          </button>
        </div>
      </div>
      </>
      )}

      {showConnectorsOverlay && ReactDOM.createPortal(
        <ConnectorsOverlay onClose={() => setShowConnectorsOverlay(false)} />,
        document.body
      )}

      {showVMOverlay && ReactDOM.createPortal(
        <VMOverlay onClose={() => setShowVMOverlay(false)} />,
        document.body
      )}

      {/* Tool Confirmation Modal */}
      {pendingConfirmation && (
        <ToolConfirmationModal
          confirmation={pendingConfirmation}
          onApprove={() => {
            if (pendingConfirmation.resolve) {
              pendingConfirmation.resolve(true);
            }
            setPendingConfirmation(null);
          }}
          onDeny={() => {
            if (pendingConfirmation.resolve) {
              pendingConfirmation.resolve(false);
            }
            setPendingConfirmation(null);
          }}
        />
      )}

      {/* Checklist Overlay */}
      {showChecklistPanel && (
        <ChecklistOverlay onClose={() => setShowChecklistPanel(false)} />
      )}

      {/* CLI Permission Modal */}
      {pendingCliPermission && (
        <CliPermissionModal
          visible={true}
          onAllowAlways={() => {
            if (pendingCliPermission.resolve) {
              pendingCliPermission.resolve('all');
            }
          }}
          onAllowOnce={() => {
            if (pendingCliPermission.resolve) {
              pendingCliPermission.resolve('all_once');
            }
          }}
          onAskEveryTime={() => {
            if (pendingCliPermission.resolve) {
              pendingCliPermission.resolve('ask_every_time');
            }
          }}
          onDeny={() => {
            if (pendingCliPermission.resolve) {
              pendingCliPermission.resolve('denied');
            }
          }}
        />
      )}

    </div>
  );
}

export default ChatMode;
