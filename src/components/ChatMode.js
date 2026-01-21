import React, { useState, useRef, useEffect, useContext } from 'react';
import { NodeContext } from '../App';
import { useStore, useProviders, processConversation } from '../store';
import MarkdownMessage from './MarkdownMessage';

function ChatMode({ nodeId, onExit }) {
  const PROVIDERS = useProviders();
  const { updateNodeData, getConnectedContext, nodes, addChatNode } = useContext(NodeContext);
  const { apiKeys, sidebarOpen, setSidebarOpen, setChatMode } = useStore();

  const node = nodes.find(n => n.id === nodeId);
  const [messages, setMessages] = useState(node?.data?.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(node?.data?.provider || 'claude');
  const [model, setModel] = useState(node?.data?.model || 'claude-sonnet-4-20250514');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const isUpdatingFromProp = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset state when nodeId changes
  useEffect(() => {
    if (node) {
      setMessages(node.data?.messages || []);
      setProvider(node.data?.provider || 'claude');
      setModel(node.data?.model || 'claude-sonnet-4-20250514');
    }
  }, [nodeId]);

  useEffect(() => {
    // Only scroll if new messages were added (not on initial mount or prop updates)
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Sync local state when node data changes (e.g., from ChatNode or Toolbar)
  useEffect(() => {
    isUpdatingFromProp.current = true;
    if (node?.data?.provider && node.data.provider !== provider) {
      setProvider(node.data.provider);
    }
    if (node?.data?.model && node.data.model !== model) {
      setModel(node.data.model);
    }
    if (node?.data?.messages && node.data.messages.length > messages.length) {
      setMessages(node.data.messages);
    }
    setTimeout(() => {
      isUpdatingFromProp.current = false;
    }, 0);
  }, [node?.data?.provider, node?.data?.model, node?.data?.messages]);

  useEffect(() => {
    if (node && !isUpdatingFromProp.current) {
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setInput('');
    setIsLoading(true);

    const context = getConnectedContext(nodeId);

    // Process conversation in background - it will continue even if chat mode is closed
    processConversation(
      nodeId,
      userMessage,
      messages,
      provider,
      model,
      context,
      updateNodeData, // Pass updateNodeData so it persists after unmount
      (updatedMessages) => {
        // Only update UI if component is still mounted
        if (isMountedRef.current) {
          setMessages(updatedMessages);
        }
      }
    ).catch((error) => {
      console.error('Conversation error:', error);
    }).finally(() => {
      // Only update loading state if still mounted
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });
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
    updateNodeData(nodeId, { messages: updatedMessages });

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
    <div className={`chat-mode-overlay ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="chat-mode-back" onClick={onExit}>
        ✕
      </button>

      <div className="chat-mode-content">
        <div className="chat-mode-messages">
          {messages.length === 0 ? (
            <div className="empty-node" style={{ height: '200px' }}>
              <span>Start a conversation...</span>
            </div>
          ) : (
            messages.map((msg, index) => (
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
            ))
          )}
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
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          ↑
        </button>
      </div>
    </div>
  );
}

export default ChatMode;
