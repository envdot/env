import React, { useState, useRef, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { NodeContext } from '../App';
import { useStore, useProviders, processConversation } from '../store';
import MarkdownMessage from './MarkdownMessage';
import { ToolResultCompact, ToolCallCompact } from './ToolCompact';
import ConnectorsOverlay from './ConnectorsOverlay';

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
  } = useStore();

  const node = nodes.find(n => n.id === nodeId);
  const conversation = useStore(state => state.conversations[nodeId]) || getConversation(nodeId);
  const messages = conversation.messages;
  const isLoading = conversation.isLoading;
  const provider = conversation.provider || node?.data?.provider || 'claude';
  const model = conversation.model || node?.data?.model || null;

  const [input, setInput] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showConnectorsDropdown, setShowConnectorsDropdown] = useState(false);
  const [showVMDropdown, setShowVMDropdown] = useState(false);
  const [showConnectorsOverlay, setShowConnectorsOverlay] = useState(false);
  const [modelFilter, setModelFilter] = useState('cloud');
  const [userDisplayName, setUserDisplayName] = useState(() => localStorage.getItem('userDisplayName') || '');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const isMountedRef = useRef(true);
  const modelDropdownRef = useRef(null);
  const connectorsDropdownRef = useRef(null);
  const vmDropdownRef = useRef(null);

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
    const storeConv = useStore.getState().conversations[nodeId];
    if (!storeConv && node) {
      updateConversation(nodeId, {
        messages: node.data?.messages || [],
        isLoading: false,
        provider: node.data?.provider || 'claude',
        model: node.data?.model || null
      });
    }
  }, [nodeId, node]);

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
    };

    if (showModelDropdown || showConnectorsDropdown || showVMDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelDropdown, showConnectorsDropdown, showVMDropdown]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setInput('');
    setConversationLoading(nodeId, true);

    // Get the LATEST provider and model from store directly
    const freshConversation = useStore.getState().conversations[nodeId];
    const freshProvider = freshConversation?.provider || node?.data?.provider || 'claude';
    const freshModel = freshConversation?.model || node?.data?.model || null;

    console.log('💬 ChatMode handleSend - using provider/model:', {
      freshProvider,
      freshModel,
      conversationInStore: freshConversation
    });

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

  const handleKeyDown = (e) => {
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
    <div className={`chat-mode-overlay ${sidebarOpen && !isChatWindow ? 'sidebar-open' : ''} ${messages.length === 0 ? 'chat-mode-welcome' : ''} ${isChatWindow ? 'chat-window-mode' : ''}`}>
      {isChatWindow && (
        <div className="chat-window-drag-region" />
      )}
      {!isChatWindow && (
        <button className="chat-mode-back" onClick={onExit}>
          ✕
        </button>
      )}

      {messages.length === 0 ? (
        <div className="chat-mode-welcome-screen">
          {userDisplayName && (
            <h1 className="chat-mode-welcome-heading">Hi {userDisplayName}!</h1>
          )}
          <div className="chat-mode-input-wrapper chat-mode-input-centered">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
            />
            <div className="chat-mode-button-bar">
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
                    <button className="connector-option" onClick={() => setShowConnectorsDropdown(false)}>
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
                    <button className="vm-option" onClick={() => { setShowVMDropdown(false); /* TODO: Open Mac VM */ }} title="macOS">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </button>
                    <button className="vm-option" onClick={() => { setShowVMDropdown(false); /* TODO: Open Linux VM */ }} title="Linux">
                      <svg width="20" height="20" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>
                        <path fill="currentColor" d="M173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>
                      </svg>
                    </button>
                    <button className="vm-option" onClick={() => { setShowVMDropdown(false); /* TODO: Open Windows VM */ }} title="Windows">
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
              <button onClick={handleSend} disabled={isLoading || !input.trim()}>
                <svg width="18" height="18" viewBox="0 0 512 512" fill="none" stroke="#999" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M112 244l144-144 144 144M256 120v292"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="chat-mode-content">
            <div className="chat-mode-messages">
              {messages.map((msg, index) => (
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
                      {msg.content && <MarkdownMessage content={msg.content} />}

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
            {isLoading && (
              <div className="message assistant loading">
                <div className="loading-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="chat-mode-input-wrapper">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
        />
        <div className="chat-mode-button-bar">
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
                <button className="connector-option" onClick={() => setShowConnectorsDropdown(false)}>
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
                <button className="vm-option" onClick={() => { setShowVMDropdown(false); /* TODO: Open Mac VM */ }} title="macOS">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </button>
                <button className="vm-option" onClick={() => { setShowVMDropdown(false); /* TODO: Open Linux VM */ }} title="Linux">
                  <svg width="20" height="20" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>
                        <path fill="currentColor" d="M173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/>
                      </svg>
                </button>
                <button className="vm-option" onClick={() => { setShowVMDropdown(false); /* TODO: Open Windows VM */ }} title="Windows">
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
          <button className="chat-mode-send-btn" onClick={handleSend} disabled={isLoading || !input.trim()}>
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
    </div>
  );
}

export default ChatMode;
