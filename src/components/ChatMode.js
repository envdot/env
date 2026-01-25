import React, { useState, useRef, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { NodeContext } from '../App';
import { useStore, useProviders, processConversation } from '../store';
import MarkdownMessage from './MarkdownMessage';
import ConnectorsOverlay from './ConnectorsOverlay';

function ChatMode({ nodeId, onExit }) {
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
    setConversationLoading
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
  const [showConnectorsOverlay, setShowConnectorsOverlay] = useState(false);
  const [modelFilter, setModelFilter] = useState('cloud');
  const [userDisplayName, setUserDisplayName] = useState(() => localStorage.getItem('userDisplayName') || '');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const isMountedRef = useRef(true);
  const modelDropdownRef = useRef(null);
  const connectorsDropdownRef = useRef(null);

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
    };

    if (showModelDropdown || showConnectorsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelDropdown, showConnectorsDropdown]);

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
    let selectedProvider = provider; // default to current
    for (const [providerId, prov] of Object.entries(PROVIDERS)) {
      if (prov.models.find(m => m.id === modelId)) {
        selectedProvider = providerId;
        break;
      }
    }

    // Update conversation with both model AND provider
    updateConversation(nodeId, { model: modelId, provider: selectedProvider });
    updateNodeData(nodeId, { model: modelId, provider: selectedProvider });
    setShowModelDropdown(false);
  };

  const getCurrentModelName = () => {
    if (!model) return 'Select Model';
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
    <div className={`chat-mode-overlay ${sidebarOpen ? 'sidebar-open' : ''} ${messages.length === 0 ? 'chat-mode-welcome' : ''}`}>
      <button className="chat-mode-back" onClick={onExit}>
        ✕
      </button>

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

                    {Object.entries(PROVIDERS)
                      .filter(([key, prov]) => prov.type === modelFilter)
                      .map(([providerId, prov]) => (
                        <div key={providerId} className="model-group">
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
                // Tool results display
                <div key={msg.id} className="tool-result-container">
                  <div className="tool-results">
                    {msg.toolResults.map((tr, i) => (
                      <div key={i} className={`tool-result-item ${tr.result.success ? 'success' : 'error'}`}>
                        <div className="tool-result-header">
                          <span className="tool-icon">{tr.result.success ? '✓' : '✗'}</span>
                          <span className="tool-name">{tr.name}</span>
                        </div>
                        <pre className="tool-output">
                          {tr.result.content || tr.result.stdout || tr.result.listing || tr.result.message || tr.result.error || JSON.stringify(tr.result, null, 2)}
                        </pre>
                      </div>
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
                      <span className="branch-marker-icon">⑂</span>
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
                      ⎘
                    </button>
                    <button
                      className="message-action-btn"
                      onClick={() => handleBranch(index)}
                      title="Branch from here"
                    >
                      ⑂
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
                      <span className="branch-marker-icon">⑂</span>
                    </div>
                  )}
                  <div className="assistant-message">
                    <div className="assistant-message-content">
                      {msg.content && <MarkdownMessage content={msg.content} />}

                      {/* Tool calls display */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="tool-calls">
                          {msg.toolCalls.map((tc, i) => (
                            <div key={i} className="tool-call">
                              <div className="tool-call-header">
                                <span className="tool-icon">⚙</span>
                                <span className="tool-name">{tc.name}</span>
                              </div>
                              <pre className="tool-input">{JSON.stringify(tc.input, null, 2)}</pre>
                            </div>
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
                        ⎘
                      </button>
                      <button
                        className="message-action-btn"
                        onClick={() => handleBranch(index)}
                        title="Branch from here"
                      >
                        ⑂
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

                {Object.entries(PROVIDERS)
                  .filter(([key, prov]) => prov.type === modelFilter)
                  .map(([providerId, prov]) => (
                    <div key={providerId} className="model-group">
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
          <button onClick={handleSend} disabled={isLoading || !input.trim()}>
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
