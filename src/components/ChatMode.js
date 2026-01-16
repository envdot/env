import React, { useState, useRef, useEffect, useContext } from 'react';
import { NodeContext } from '../App';
import { useStore, PROVIDERS, callAPI, executeTool } from '../store';
import MarkdownMessage from './MarkdownMessage';

function ChatMode({ nodeId, onExit }) {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    if (node?.data?.messages && node.data.messages !== messages) {
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

    let currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      const context = getConnectedContext(nodeId);

      // Tool call loop - keep going until no more tool calls
      let continueLoop = true;
      let loopCount = 0;
      const maxLoops = 10; // Safety limit

      while (continueLoop && loopCount < maxLoops) {
        loopCount++;
        const allMessages = [...context, ...currentMessages];

        const response = await callAPI(provider, model, allMessages, apiKeys[provider]);

        // If there are tool calls, execute them and continue
        if (response.toolCalls && response.toolCalls.length > 0) {
          // Add assistant message with tool calls
          const assistantMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.content || '',
            toolCalls: response.toolCalls,
          };
          currentMessages = [...currentMessages, assistantMessage];
          setMessages(currentMessages);

          // Execute each tool and collect results
          const toolResults = [];
          for (const toolCall of response.toolCalls) {
            const result = await executeTool(toolCall.name, toolCall.input);
            toolResults.push({
              tool_use_id: toolCall.id,
              name: toolCall.name,
              input: toolCall.input,
              result: result
            });
          }

          // Add tool results as a user message (how Claude expects it)
          const toolResultMessage = {
            id: (Date.now() + 1).toString(),
            role: 'user',
            content: '', // Content is in toolResults
            toolResults: toolResults,
            isToolResult: true, // Flag for UI rendering
          };
          currentMessages = [...currentMessages, toolResultMessage];
          setMessages(currentMessages);

        } else {
          // No tool calls, just add the response and stop
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.content || '',
          };
          currentMessages = [...currentMessages, assistantMessage];
          setMessages(currentMessages);
          continueLoop = false;
        }
      }
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
      };
      setMessages([...currentMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
