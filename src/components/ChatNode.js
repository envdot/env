import React, { useState, useContext, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from 'reactflow';
import { NodeContext } from '../App';
import { useStore, useProviders, processConversation } from '../store';
import MarkdownMessage from './MarkdownMessage';

function ChatNode({ id, data }) {
  const PROVIDERS = useProviders();
  const [messages, setMessages] = useState(data.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(data.provider || 'claude');
  const [model, setModel] = useState(data.model || 'claude-sonnet-4-20250514');
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [modelFilter, setModelFilter] = useState('cloud'); // 'cloud' or 'local'
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [highlightedBranchId, setHighlightedBranchId] = useState(null);
  const nodeRef = useRef(null);
  const branchMarkerRefs = useRef({});
  const messageRefs = useRef({}); // Track message container refs

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isUpdatingFromProp = useRef(false);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const prevMessagesLengthRef = useRef(0);
  const isMountedRef = useRef(true);
  const { updateNodeData, deleteNode, addChatNode, getConnectedContext, edges } = useContext(NodeContext);
  const { apiKeys, setChatMode } = useStore();
  const { setViewport, setEdges } = useReactFlow();
  const zoomEnabledRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Only scroll if new messages were added (not on initial mount or prop updates)
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Intersection Observer for branch markers
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    // Track which markers are currently being observed to avoid duplicates
    const observedElements = new WeakSet();
    // Track visibility state to prevent duplicate events
    const visibilityState = new Map();

    let observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Get branch info from the message container div
          const branchId = entry.target.dataset.branchId;
          const color = entry.target.dataset.branchColor;
          
          // Only process if this message actually has a branch marker element
          const branchMarkerEl = entry.target.querySelector('.branch-marker');
          const hasBranchMarker = branchMarkerEl !== null;
          
          if (branchId && hasBranchMarker && color) {
            const key = `${branchId}-${id}`;
            const wasVisible = visibilityState.get(key) || false;
            const isVisible = entry.isIntersecting;
            const intersectionRatio = entry.intersectionRatio;
            
            // Turn on when ANY part becomes visible
            if (isVisible && !wasVisible) {
              visibilityState.set(key, true);
              window.dispatchEvent(new CustomEvent('branchMarkerVisible', {
                detail: { branchId, color, nodeId: id }
              }));
            } 
            // Turn off ONLY when completely out of view
            // Check both intersectionRatio === 0 AND manual bounds check for accuracy
            else if (!isVisible && wasVisible) {
              // Double-check with manual bounds calculation
              const containerRect = messagesContainerRef.current.getBoundingClientRect();
              const messageRect = entry.target.getBoundingClientRect();
              
              // Message is out if it doesn't overlap with container at all
              const isActuallyOut = (
                messageRect.bottom <= containerRect.top ||
                messageRect.top >= containerRect.bottom ||
                messageRect.right <= containerRect.left ||
                messageRect.left >= containerRect.right
              );
              
              if (isActuallyOut || intersectionRatio === 0) {
                visibilityState.set(key, false);
                window.dispatchEvent(new CustomEvent('branchMarkerHidden', {
                  detail: { branchId, nodeId: id }
                }));
              }
            }
          }
        });
      },
      {
        root: messagesContainerRef.current,
        threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 0.99, 1.0], // Track at multiple points to accurately detect when fully out
        rootMargin: '0px' // Use exact container bounds
      }
    );

    // Resize handler - recreate observer with updated root to fix offset issues
    let resizeTimeout = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      // Use requestAnimationFrame for immediate recalculation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Get all refs to reobserve
          const messageContainers = Object.values(messageRefs.current);
          const allRefs = messageContainers.filter(ref => ref && ref.isConnected);
          
          // Unobserve all current elements
          allRefs.forEach(ref => {
            if (observedElements.has(ref)) {
              observer.unobserve(ref);
              observedElements.delete(ref);
            }
          });
          
          // Disconnect and create new observer with updated root dimensions
          observer.disconnect();
          observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                const branchId = entry.target.dataset.branchId;
                const color = entry.target.dataset.branchColor;
                if (branchId) {
                  const key = `${branchId}-${id}`;
                  const wasVisible = visibilityState.get(key) || false;
                  const isVisible = entry.isIntersecting;
                  
                  if (isVisible && !wasVisible) {
                    visibilityState.set(key, true);
                    window.dispatchEvent(new CustomEvent('branchMarkerVisible', {
                      detail: { branchId, color, nodeId: id }
                    }));
                  } else if (!isVisible && wasVisible) {
                    visibilityState.set(key, false);
                    window.dispatchEvent(new CustomEvent('branchMarkerHidden', {
                      detail: { branchId, nodeId: id }
                    }));
                  }
                }
              });
            },
            {
              root: messagesContainerRef.current,
              threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 0.99, 1.0],
              rootMargin: '0px'
            }
          );
          
          // Re-observe all message containers immediately
          allRefs.forEach(ref => {
            if (ref && ref.isConnected) {
              observer.observe(ref);
              observedElements.add(ref);
            }
          });
        });
      });
    };

    // ResizeObserver to detect when the messages container is resized
    const resizeObserver = new ResizeObserver(handleResize);
    
    resizeObserver.observe(messagesContainerRef.current);
    
    // Also observe the node itself for resizing (in case the entire node is resized)
    // Use a timeout to ensure nodeRef is set
    const nodeObserveTimeout = setTimeout(() => {
      if (nodeRef.current) {
        resizeObserver.observe(nodeRef.current);
      }
    }, 100);
    

    // Observe all message containers that have branch markers - wait for refs to be set
    const observeMarkers = () => {
      // Get all branch markers from current messages
      const currentBranchIds = new Set(
        messages
          .filter(msg => msg.branchMarker)
          .map(msg => msg.branchMarker.branchId)
      );
      
      // Clean up refs that no longer exist
      Object.keys(messageRefs.current).forEach(branchId => {
        if (!currentBranchIds.has(branchId)) {
          const ref = messageRefs.current[branchId];
          if (ref && observedElements.has(ref)) {
            observer.unobserve(ref);
            observedElements.delete(ref);
          }
          delete messageRefs.current[branchId];
          delete branchMarkerRefs.current[branchId];
        }
      });
      
      // Observe the message containers (not the small marker divs)
      const messageContainers = Object.values(messageRefs.current);
      messageContainers.forEach((ref) => {
        if (ref && ref.isConnected && !observedElements.has(ref)) {
          observer.observe(ref);
          observedElements.add(ref);
        }
      });
    };

    // Use requestAnimationFrame to ensure refs are set after render
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(observeMarkers);
    });

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(nodeObserveTimeout);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      visibilityState.clear();
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [messages, id]);

  // Branch marker visibility tracking (highlighting removed for now)
  useEffect(() => {
    // Placeholder for future edge highlighting functionality
  }, [data.branchMetadata, data.branchFrom, id]);

  // Sync local state when data prop changes (e.g., from ChatMode or Toolbar)
  useEffect(() => {
    isUpdatingFromProp.current = true;
    if (data.provider && data.provider !== provider) {
      setProvider(data.provider);
    }
    if (data.model && data.model !== model) {
      setModel(data.model);
    }
    if (data.messages && data.messages.length > messages.length) {
      setMessages(data.messages);
    }
    setTimeout(() => {
      isUpdatingFromProp.current = false;
    }, 0);
  }, [data.provider, data.model, data.messages]);

  useEffect(() => {
    // Don't update if we're currently syncing from props
    if (isUpdatingFromProp.current) {
      return;
    }
    updateNodeData(id, { messages, provider, model });
  }, [messages, provider, model, id, updateNodeData]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setInput('');
    setIsLoading(true);

    // Get context from connected nodes
    const context = getConnectedContext(id);

    // Process conversation in background - it will continue even if component unmounts
    // Don't await or chain anything that could stop the promise
    processConversation(
      id,
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
    );

    // Set loading to false immediately since processing continues in background
    setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
    updateNodeData(id, { messages: updatedMessages });

    const currentPos = document.querySelector(`[data-id="${id}"]`)?.getBoundingClientRect();

    const metadata = { branchId, color: branchColor, branchedFromMessageIndex: messageIndex };
    console.log('Creating branch with metadata:', metadata);

    addChatNode(
      { x: (currentPos?.x || 200) + 450, y: (currentPos?.y || 200) + 50 },
      id,
      branchMessages,
      metadata
    );
  };

  const handleModelChange = (newProvider, newModel) => {
    setProvider(newProvider);
    setModel(newModel);
    setShowModelSelect(false);
  };

  return (
    <div
      ref={nodeRef}
      className={`chat-node ${isCollapsed ? 'collapsed' : ''} ${highlightedBranchId ? 'branch-highlighted' : ''}`}
      style={highlightedBranchId && data.branchMetadata?.color ? {
        boxShadow: `0 0 20px ${data.branchMetadata.color}, 0 0 40px ${data.branchMetadata.color}40`
      } : {}}
    >
      <NodeResizer
        minWidth={250}
        minHeight={200}
        isVisible={!isCollapsed}
        lineClassName="node-resizer-line"
        handleClassName="node-resizer-handle"
      />
      <Handle type="target" position={Position.Left} className="handle" />
      
      <div className="node-header">
        <div className="node-title" onClick={() => setShowModelSelect(!showModelSelect)}>
          <span className="provider-icon">{PROVIDERS[provider]?.icon}</span>
          <span className="model-name">{PROVIDERS[provider]?.models.find(m => m.id === model)?.name || model}</span>
          <span className="dropdown-arrow">▼</span>
        </div>
        
        <div className="node-actions">
          <button
            className="expand-btn"
            onClick={() => setChatMode(id)}
            title="Open in chat mode"
          >
            ⛶
          </button>
          <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '□' : '—'}
          </button>
          <button className="delete-btn" onClick={() => deleteNode(id)}>×</button>
        </div>
        
        {showModelSelect && (
          <div className="model-dropdown">
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
              .map(([key, prov]) => (
                <div key={key} className="model-group">
                  <div className="model-group-title">{prov.icon} {prov.name}</div>
                  {prov.models.map((m) => (
                    <div
                      key={m.id}
                      className={`model-option ${provider === key && model === m.id ? 'active' : ''} ${!apiKeys[key] && prov.type === 'cloud' ? 'no-key' : ''}`}
                      onClick={() => handleModelChange(key, m.id)}
                    >
                      {m.name}
                      {!apiKeys[key] && prov.type === 'cloud' && <span className="no-key-indicator"> (no key)</span>}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div
            ref={messagesContainerRef}
            className="node-messages nodrag nowheel"
          >
            {messages.length === 0 ? (
              <div className="empty-node">
                <span>Start a conversation...</span>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`message ${msg.role} ${msg.branchMarker ? 'has-branch-marker' : ''} ${msg.isToolResult ? 'tool-result' : ''} ${msg.toolCalls ? 'has-tool-calls' : ''}`}
                  ref={(el) => {
                    // Store ref to the message container if it has a branch marker
                    if (msg.branchMarker && el) {
                      messageRefs.current[msg.branchMarker.branchId] = el;
                    } else if (msg.branchMarker && !el) {
                      // Clean up if message is removed
                      delete messageRefs.current[msg.branchMarker.branchId];
                    }
                  }}
                  data-branch-id={msg.branchMarker?.branchId}
                  data-branch-color={msg.branchMarker?.color}
                >
                  {msg.branchMarker && (
                    <div
                      className="branch-marker"
                      style={{ backgroundColor: msg.branchMarker.color }}
                      title={`Branch point: ${msg.branchMarker.branchId}`}
                    >
                      <span className="branch-marker-icon">⑂</span>
                    </div>
                  )}
                  <div className="message-content">
                    {/* Regular message content */}
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

                    {/* Tool results display */}
                    {msg.isToolResult && msg.toolResults && (
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
                    )}
                  </div>
                  {!msg.isToolResult && (
                    <button
                      className="branch-btn"
                      onClick={() => handleBranch(index)}
                      title="Branch from here"
                    >
                      ⑂
                    </button>
                  )}
                </div>
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

          <div className="node-input">
            <textarea
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
        </>
      )}

      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  );
}

export default ChatNode;
