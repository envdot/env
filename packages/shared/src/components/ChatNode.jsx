import React, { useState, useContext, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from 'reactflow';
import { NodeContext } from '../App';
import { useStore, useProviders, processConversation } from '../store';
import MarkdownMessage from './MarkdownMessage';
import { ToolResultCompact, ToolCallCompact } from './ToolCompact';
import PixelLoader from './PixelLoader';
import CommandPalette from './CommandPalette';
import { useSlashCommands } from '../hooks/useSlashCommands';

function ChatNode({ id, data }) {
  const PROVIDERS = useProviders();

  // Use centralized store for conversation state
  const {
    apiKeys,
    setChatMode,
    getConversation,
    updateConversation,
    setConversationMessages,
    setConversationLoading,
    conversationQueue,
  } = useStore();

  // Subscribe to conversation changes with session-scoped key
  const activeChatSession = useStore(state => state.activeChatSession);
  const convKey = `${activeChatSession || '_default'}::${id}`;
  const conversation = useStore(state => state.conversations[convKey]);
  const messages = conversation?.messages || data.messages || [];
  const isLoading = conversation?.isLoading || false;
  const provider = conversation?.provider || data.provider || 'claude';
  const model = conversation?.model || data.model || null;

  const [input, setInput] = useState('');
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [modelFilter, setModelFilter] = useState('cloud'); // 'cloud' or 'local'
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [highlightedBranchId, setHighlightedBranchId] = useState(null);
  const slashCommands = useSlashCommands(null);
  const nodeRef = useRef(null);
  const branchMarkerRefs = useRef({});
  const messageRefs = useRef({}); // Track message container refs

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const prevMessagesLengthRef = useRef(0);
  const isMountedRef = useRef(true);
  const { updateNodeData, deleteNode, addChatNode, getConnectedContext, edges } = useContext(NodeContext);
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
    // Scroll to bottom on mount or when messages change
    // Use 'auto' for instant scroll without animation
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    prevMessagesLengthRef.current = messages.length;

    // Debug: Log messages with branch markers
    const messagesWithMarkers = messages.filter(m => m.branchMarker);
    if (messagesWithMarkers.length > 0) {
      console.log(`🔖 Node ${id} rendering ${messagesWithMarkers.length} messages with branch markers:`, messagesWithMarkers);
    }
  }, [messages, id]);

  // Intersection Observer for branch markers
  useEffect(() => {
    // Don't set up observer if node is collapsed (container doesn't exist)
    if (!messagesContainerRef.current || isCollapsed) return;

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
  }, [messages, id, isCollapsed]);

  // Branch marker visibility tracking - highlight this node when its branch marker is visible
  useEffect(() => {
    const handleMarkerVisible = (event) => {
      const { branchId, nodeId } = event.detail;
      // If a branch marker becomes visible in ANY node and this node is the branch target
      if (data.branchMetadata?.branchId === branchId) {
        setHighlightedBranchId(branchId);
      }
    };

    const handleMarkerHidden = (event) => {
      const { branchId } = event.detail;
      // If the marker for this node's branch is hidden, remove highlight
      if (data.branchMetadata?.branchId === branchId) {
        setHighlightedBranchId(null);
      }
    };

    window.addEventListener('branchMarkerVisible', handleMarkerVisible);
    window.addEventListener('branchMarkerHidden', handleMarkerHidden);

    return () => {
      window.removeEventListener('branchMarkerVisible', handleMarkerVisible);
      window.removeEventListener('branchMarkerHidden', handleMarkerHidden);
    };
  }, [data.branchMetadata, id]);

  // Initialize conversation in store if not present
  useEffect(() => {
    const state = useStore.getState();
    const key = state._convKey(id);
    const storeConv = state.conversations[key];
    if (!storeConv) {
      updateConversation(id, {
        messages: data.messages || [],
        isLoading: false,
        provider: data.provider || 'claude',
        model: data.model || null
      });
    }
  }, [id, activeChatSession]);

  // Sync node data when conversation changes
  useEffect(() => {
    updateNodeData(id, { messages, provider, model });
  }, [messages, provider, model, id, updateNodeData]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // ═══ Fallback slash command detection ═══
    const trimmed = input.trim();
    if (trimmed.startsWith('/') && !trimmed.includes(' ')) {
      const cmdName = trimmed.slice(1).toLowerCase();
      const allCmds = slashCommands.filteredCommands;
      const cmd = allCmds.find(c => c.name.toLowerCase() === cmdName);
      if (cmd) {
        executeSlashCommand(cmd);
        return;
      }
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setInput('');
    setConversationLoading(id, true);

    // Get the LATEST provider and model from store directly
    const freshState = useStore.getState();
    const freshConversation = freshState.conversations[freshState._convKey(id)];
    const freshProvider = freshConversation?.provider || data.provider || 'claude';
    const freshModel = freshConversation?.model || data.model || null;

    console.log('💬 handleSend - using provider/model:', {
      freshProvider,
      freshModel,
      componentProvider: provider,
      componentModel: model,
      conversationInStore: freshConversation
    });

    // Get context from connected nodes
    const context = getConnectedContext(id);

    // Process conversation in background - it will continue even if component unmounts
    // Don't await or chain anything that could stop the promise
    processConversation(
      id,
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
    const queueState = conversationQueue[state._convKey(id)];
    if (queueState?.abort) {
      queueState.abort();
    }
    setConversationLoading(id, false);
  };

  // Helper: append a system-style result message instantly (no AI call)
  const addSystemMsg = (content) => {
    const msg = { id: `sys-${Date.now()}`, role: 'assistant', content };
    setConversationMessages(id, [...messages, msg]);
  };

  const executeSlashCommand = (cmd) => {
    setInput('');
    slashCommands.close();
    const name = cmd.name;
    const category = cmd.category || 'fire';

    // ═══ LOCAL commands ═══
    if (category === 'local' || name === 'clear') {
      if (name === 'clear') { setConversationMessages(id, []); return; }
      if (name === 'compact') {
        const kept = messages.slice(-4);
        const summary = { id: `compact-${Date.now()}`, role: 'assistant', content: `*Context compacted — kept last ${kept.length} messages, cleared ${messages.length - kept.length} older messages.*` };
        setConversationMessages(id, [...kept, summary]); return;
      }
      return;
    }

    // ═══ INTERACTIVE commands ═══
    if (category === 'interactive') {
      if (name === 'model') { setShowModelSelect(true); return; }
      return;
    }

    // ═══ Unknown command ═══
    addSystemMsg(`*Unknown command: \`/${name}\`*`);
  };

  const handleKeyDown = (e) => {
    const slash = slashCommands.handleKeyDown(e);
    if (slash.consumed) {
      if (slash.command) executeSlashCommand(slash.command);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBranch = (messageIndex) => {
    console.log('🌿🌿🌿 BRANCH BUTTON CLICKED!!! 🌿🌿🌿');
    console.log('🌿 handleBranch called:', { messageIndex });

    // Generate unique branch ID and color
    const branchId = `branch-${Date.now()}`;
    const branchColor = `hsl(${Math.random() * 360}, 70%, 60%)`;

    console.log('🌿 Generated branch:', { branchId, branchColor });
    console.log('🌿 Current messages:', messages);

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

    console.log('🌿 Updated messages with marker:', updatedMessages);
    console.log('🌿 Message with marker:', updatedMessages.find(m => m.branchMarker));

    // Update both node data and store
    updateNodeData(id, { messages: updatedMessages });
    setConversationMessages(id, updatedMessages);

    console.log('🌿 Store updated, checking store state...');
    const storeState = useStore.getState();
    console.log('🌿 Store conversation:', storeState.conversations[storeState._convKey(id)]);

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
    console.log('📝 handleModelChange called:', { nodeId: id, newProvider, newModel });
    updateConversation(id, {
      provider: newProvider,
      model: newModel
    });
    const _s = useStore.getState();
    console.log('📝 After update, conversation:', _s.conversations[_s._convKey(id)]);
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
          <span className="provider-icon">{model ? PROVIDERS[provider]?.icon : ''}</span>
          <span className="model-name">{model ? (PROVIDERS[provider]?.models.find(m => m.id === model)?.name || model) : 'Models'}</span>
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
              .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999))
              .map(([key, prov]) => (
                <div key={key} className="model-group">
                  <div className="model-group-title">{prov.icon} {prov.name}</div>
                  {prov.models.map((m) => {
                    // CLI and local providers don't need API keys, cloud providers need OpenRouter key
                    const needsKey = prov.type === 'cloud';
                    const hasKey = needsKey ? !!apiKeys.openrouter : true;
                    return (
                      <div
                        key={m.id}
                        className={`model-option ${provider === key && model === m.id ? 'active' : ''} ${!hasKey ? 'no-key' : ''}`}
                        onClick={() => handleModelChange(key, m.id)}
                      >
                        {m.name}
                        {!hasKey && <span className="no-key-indicator"> (no key)</span>}
                      </div>
                    );
                  })}
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
            {messages.map((msg, index) => (
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
                      <span className="branch-marker-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 8C6.88071 8 8 6.88071 8 5.5C8 4.11929 6.88071 3 5.5 3C4.11929 3 3 4.11929 3 5.5C3 6.88071 4.11929 8 5.5 8ZM5.5 8V16M5.5 16C4.11929 16 3 17.1193 3 18.5C3 19.8807 4.11929 21 5.5 21C6.88071 21 8 19.8807 8 18.5C8 17.1193 6.88071 16 5.5 16ZM18.5 8C19.8807 8 21 6.88071 21 5.5C21 4.11929 19.8807 3 18.5 3C17.1193 3 16 4.11929 16 5.5C16 6.88071 17.1193 8 18.5 8ZM18.5 8C18.5 8.92997 18.5 9.39496 18.3978 9.77646C18.1204 10.8117 17.3117 11.6204 16.2765 11.8978C15.895 12 15.43 12 14.5 12H8.5C6.84315 12 5.5 13.3431 5.5 15"/></svg></span>
                    </div>
                  )}
                  <div className="message-content">
                    {/* Regular message content */}
                    {msg.content && <MarkdownMessage content={msg.content} />}

                    {/* Tool calls display - compact style */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="tool-compact-list">
                        {msg.toolCalls.map((tc, i) => (
                          <ToolCallCompact key={i} tc={tc} />
                        ))}
                      </div>
                    )}

                    {/* Tool results display - compact style */}
                    {msg.isToolResult && msg.toolResults && (
                      <div className="tool-compact-list">
                        {msg.toolResults.map((tr, i) => (
                          <ToolResultCompact key={i} tr={tr} />
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 8C6.88071 8 8 6.88071 8 5.5C8 4.11929 6.88071 3 5.5 3C4.11929 3 3 4.11929 3 5.5C3 6.88071 4.11929 8 5.5 8ZM5.5 8V16M5.5 16C4.11929 16 3 17.1193 3 18.5C3 19.8807 4.11929 21 5.5 21C6.88071 21 8 19.8807 8 18.5C8 17.1193 6.88071 16 5.5 16ZM18.5 8C19.8807 8 21 6.88071 21 5.5C21 4.11929 19.8807 3 18.5 3C17.1193 3 16 4.11929 16 5.5C16 6.88071 17.1193 8 18.5 8ZM18.5 8C18.5 8.92997 18.5 9.39496 18.3978 9.77646C18.1204 10.8117 17.3117 11.6204 16.2765 11.8978C15.895 12 15.43 12 14.5 12H8.5C6.84315 12 5.5 13.3431 5.5 15"/></svg>
                    </button>
                  )}
                </div>
              ))}
            {isLoading && (
              <div className="message assistant loading">
                <PixelLoader />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="node-input" style={{ position: 'relative' }}>
            {slashCommands.isOpen && (
              <CommandPalette
                commands={slashCommands.filteredCommands}
                selectedIndex={slashCommands.selectedIndex}
                onSelect={(index) => {
                  const cmd = slashCommands.selectCommand(index);
                  if (cmd) executeSlashCommand(cmd);
                }}
                menuRef={slashCommands.menuRef}
              />
            )}
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                slashCommands.handleInputChange(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
            />
            {isLoading && (
              <button className="chat-node-stop-btn" onClick={handleStop} title="Stop response">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            )}
            <button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <svg width="18" height="18" viewBox="0 0 512 512" fill="none" stroke="#999" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round">
                <path d="M112 244l144-144 144 144M256 120v292"/>
              </svg>
            </button>
          </div>
        </>
      )}

      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  );
}

export default ChatNode;
