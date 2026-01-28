import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ChatNode from './components/ChatNode';
import Toolbar from './components/Toolbar';
import Settings from './components/Settings';
import UpgradePlan from './components/UpgradePlan';
import Sidebar from './components/Sidebar';
import ChatMode from './components/ChatMode';
import { useStore, PROVIDERS } from './store';

const nodeTypes = {
  chat: ChatNode,
};

function Flow() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { showSettings, setShowSettings, showUpgradePlan, setShowUpgradePlan, apiKeys, nodeAddCount, setNodeAddCount } = useStore();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const addChatNode = useCallback((position, branchFrom = null, branchMessages = null, branchMetadata = null) => {
    const id = `chat-${Date.now()}`;
    console.log('addChatNode called with metadata:', branchMetadata);
    const newNode = {
      id,
      type: 'chat',
      position: position || { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        messages: branchMessages || [],
        provider: 'claude',
        model: null,
        branchFrom,
        branchMetadata,
      },
    };
    console.log('Creating node with data:', newNode.data);
    setNodes((nds) => [...nds, newNode]);

    // If branching, create an edge from parent
    if (branchFrom) {
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${branchFrom}-${id}`,
          source: branchFrom,
          target: id,
          animated: true,
          style: branchMetadata?.color ? { stroke: branchMetadata.color } : {},
        },
      ]);
    }

    return id;
  }, [setNodes, setEdges]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  const getConnectedContext = useCallback((nodeId) => {
    // Get all messages from connected parent nodes
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const context = [];
    
    incomingEdges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode?.data?.messages) {
        context.push(...sourceNode.data.messages);
      }
    });
    
    return context;
  }, [edges, nodes]);

  // Double-click to create new node
  const onPaneClick = useCallback((event) => {
    if (event.detail === 2) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      addChatNode(position);
    }
  }, [addChatNode]);

  return (
    <div className="app" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="#333" gap={20} />
        <Controls />
        <MiniMap 
          nodeColor="#22c55e"
          maskColor="rgba(0, 0, 0, 0.8)"
          style={{ background: '#111' }}
        />
      </ReactFlow>
      
      <Toolbar onAddNode={() => addChatNode({ x: 100, y: 100 })} />
      
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {/* Pass functions to nodes via context */}
      <NodeContext.Provider value={{ 
        updateNodeData, 
        deleteNode, 
        addChatNode,
        getConnectedContext,
        apiKeys 
      }}>
        <div style={{ display: 'none' }} />
      </NodeContext.Provider>
    </div>
  );
}

// Context for node functions
export const NodeContext = React.createContext({});

function App() {
  return (
    <ReactFlowProvider>
      <FlowWithContext />
    </ReactFlowProvider>
  );
}

function FlowWithContext() {
  const reactFlowWrapper = useRef(null);
  const initializedRef = useRef(false);
  const currentNodesRef = useRef([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Check if this is a chat-only window
  const urlParams = new URLSearchParams(window.location.search);
  const isChatWindow = urlParams.get('chatWindow') === 'true';
  const chatWindowSessionId = urlParams.get('sessionId');

  // Keep currentNodesRef in sync
  currentNodesRef.current = nodes;
  const {
    showSettings,
    setShowSettings,
    showUpgradePlan,
    setShowUpgradePlan,
    apiKeys,
    chatMode,
    setChatMode,
    activeChatSession,
    updateChatSession,
    setActiveChatSession,
    chatSessions,
    addChatSession,
    sidebarOpen,
    setCliChatbotModels,
    tabs,
    activeTabId,
    saveTabState,
  } = useStore();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#666' } }, eds)),
    [setEdges]
  );

  const addChatNode = useCallback((position, branchFrom = null, initialMessages = [], branchMetadata = null) => {
    const id = `chat-${Date.now()}`;
    console.log('addChatNode called with metadata:', branchMetadata);
    const newNode = {
      id,
      type: 'chat',
      position: position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      style: { width: 300, height: 375 },
      data: {
        messages: initialMessages,
        provider: 'claude',
        model: null,
        branchFrom,
        branchMetadata,
      },
    };
    console.log('Creating node with data:', newNode.data);
    setNodes((nds) => [...nds, newNode]);

    if (branchFrom) {
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${branchFrom}-${id}`,
          source: branchFrom,
          target: id,
          animated: true,
          style: { stroke: '#666', strokeWidth: 2 },
        },
      ]);
    }

    return id;
  }, [setNodes, setEdges]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  const getConnectedContext = useCallback((nodeId) => {
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const context = [];
    
    incomingEdges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode?.data?.messages) {
        context.push(...sourceNode.data.messages);
      }
    });
    
    return context;
  }, [edges, nodes]);

  const onPaneDoubleClick = useCallback((event) => {
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left - 200,
      y: event.clientY - bounds.top - 100,
    };
    addChatNode(position);
  }, [addChatNode]);

  const handleSaveSession = useCallback((sessionId) => {
    updateChatSession(sessionId, {
      nodes: nodes,
      edges: edges,
    });
  }, [nodes, edges, updateChatSession]);

  const handleLoadSession = useCallback((session, tabId = null) => {
    const currentCanvasNodes = currentNodesRef.current || [];
    const currentCanvasEdges = edges;
    const isSameSession = activeChatSession === session.id;

    // Save current tab state before switching
    if (activeTabId && !isSameSession) {
      saveTabState(activeTabId, currentCanvasNodes, currentCanvasEdges);
      handleSaveSession(activeChatSession);
    }

    // Determine which nodes to use
    let nodesToUse;
    let edgesToUse;

    // Check if we have a tab with stored state for this session
    const targetTab = tabId
      ? tabs.find(t => t.id === tabId)
      : tabs.find(t => t.sessionId === session.id);

    if (targetTab && targetTab.nodes && targetTab.nodes.length > 0) {
      // Use the tab's stored state
      nodesToUse = targetTab.nodes;
      edgesToUse = targetTab.edges || [];
    } else if (isSameSession) {
      // Same session: use canvas nodes if session.nodes is empty (not yet saved)
      nodesToUse = (session.nodes && session.nodes.length > 0) ? session.nodes : currentCanvasNodes;
      edgesToUse = (session.edges && session.edges.length > 0) ? session.edges : currentCanvasEdges;
    } else {
      // Different session: use the session's saved nodes
      nodesToUse = session.nodes || [];
      edgesToUse = session.edges || [];
    }

    // Load nodes and edges onto canvas
    if (!isSameSession) {
      setNodes(nodesToUse);
      setEdges(edgesToUse);
    }

    // Update active session
    setActiveChatSession(session.id);

    // Enter chat mode with the first node
    if (nodesToUse.length > 0) {
      setChatMode(nodesToUse[0].id);
    }
  }, [setNodes, setEdges, edges, activeChatSession, activeTabId, tabs, handleSaveSession, setChatMode, saveTabState, setActiveChatSession]);

  const handleNewSession = useCallback((session) => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const handleSaveCurrentSession = useCallback(() => {
    if (activeChatSession) {
      handleSaveSession(activeChatSession);
    } else {
      // Create new session with current canvas state
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
      handleSaveSession(sessionId);
    }
  }, [activeChatSession, chatSessions, addChatSession, setActiveChatSession, handleSaveSession]);

  // Auto-save with debouncing
  useEffect(() => {
    // Only auto-save if there's an active session and there are nodes or edges
    if (activeChatSession && (nodes.length > 0 || edges.length > 0)) {
      const timeoutId = setTimeout(() => {
        handleSaveSession(activeChatSession);
        // Also save to active tab if there is one
        if (activeTabId) {
          saveTabState(activeTabId, nodes, edges);
        }
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, activeChatSession, activeTabId, handleSaveSession, saveTabState]);

  // Initialize with chat mode on first load
  useEffect(() => {
    // Handle chat window mode - load specific session
    if (isChatWindow && chatWindowSessionId && !initializedRef.current) {
      initializedRef.current = true;
      const session = chatSessions.find(s => s.id === chatWindowSessionId);
      if (session && session.nodes && session.nodes.length > 0) {
        setNodes(session.nodes);
        setEdges(session.edges || []);
        setActiveChatSession(session.id);
        setChatMode(session.nodes[0].id);
      }
      return;
    }

    // Normal initialization for main window
    if (!initializedRef.current && chatSessions.length === 0 && nodes.length === 0 && !isChatWindow) {
      initializedRef.current = true;
      // Create initial session and node
      const sessionId = `session-${Date.now()}`;
      const nodeId = `chat-${Date.now()}`;

      // Create the node object
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

      // Create session with the node already included
      const newSession = {
        id: sessionId,
        name: 'Chat 1',
        timestamp: Date.now(),
        nodes: [initialNode],
        edges: [],
      };

      addChatSession(newSession);
      setActiveChatSession(sessionId);

      // Add node to canvas and enter chat mode
      setNodes([initialNode]);
      setChatMode(nodeId);
    }
  }, [chatSessions, nodes.length, addChatSession, setActiveChatSession, setNodes, setEdges, setChatMode, isChatWindow, chatWindowSessionId]);

  // Detect CLI chatbots on startup (with small delay to let app initialize)
  useEffect(() => {
    const detectCliChatbots = async () => {
      try {
        if (window.electronAPI?.cliChatbots?.detect) {
          const result = await window.electronAPI.cliChatbots.detect();
          if (result.success && result.chatbots) {
            setCliChatbotModels(result.chatbots);
          }
        }
      } catch (error) {
        console.error('Failed to detect CLI chatbots on startup:', error);
      }
    };

    // Small delay to ensure app is fully loaded
    const timer = setTimeout(detectCliChatbots, 1000);
    return () => clearTimeout(timer);
  }, [setCliChatbotModels]);

  // Handle branch marker visibility to highlight edges with marker color
  const highlightedEdgesRef = useRef(new Set());
  const nodesRef = useRef(nodes);

  // Keep nodesRef in sync with nodes
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  useEffect(() => {
    const handleMarkerVisible = (event) => {
      const { branchId, color, nodeId } = event.detail;
      console.log('🔥 handleMarkerVisible received:', { branchId, color, nodeId });
      console.log('  All nodes:', nodesRef.current.map(n => ({ id: n.id, branchId: n.data?.branchMetadata?.branchId })));
      console.log('  All edges:', edges.map(e => ({ id: e.id, source: e.source, target: e.target })));
      
      // Find the edge that corresponds to this branch
      // Must match: source node = nodeId AND target node has branchMetadata.branchId = branchId
      setEdges((eds) => {
        let matched = false;
        const updated = eds.map((edge) => {
          // Only check edges from the source node
          if (edge.source === nodeId) {
            const targetNode = nodesRef.current.find((n) => n.id === edge.target);
            const targetBranchId = targetNode?.data?.branchMetadata?.branchId;
            
            console.log(`  Checking edge ${edge.id}: source=${edge.source}, target=${edge.target}, targetBranchId=${targetBranchId}, lookingFor=${branchId}`);
            
            // Must have exact match
            if (targetBranchId === branchId) {
              matched = true;
              // Skip if already highlighted with the same color
              if (highlightedEdgesRef.current.has(edge.id) && edge.style?.stroke === color) {
                console.log('  Already highlighted, skipping');
                return edge;
              }
              
              console.log('  ✅✅✅ MATCHED! Highlighting edge:', edge.id, 'with color:', color);
              highlightedEdgesRef.current.add(edge.id);
              
              // Store original style if not already stored
              const originalStyle = edge.originalStyle || JSON.parse(JSON.stringify(edge.style || { stroke: '#666', strokeWidth: 2 }));
              return {
                ...edge,
                originalStyle,
                className: 'edge-highlighted',
                style: {
                  ...originalStyle,
                  stroke: color,
                  strokeWidth: 4,
                },
              };
            }
          }
          return edge;
        });
        
        if (!matched) {
          console.warn('  ⚠️ No edge matched for branchId:', branchId, 'from node:', nodeId);
        }
        
        return updated;
      });
    };

    const handleMarkerHidden = (event) => {
      const { branchId, nodeId } = event.detail;
      console.log('❌ handleMarkerHidden received:', { branchId, nodeId });
      
      // Restore original grey style for the edge
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.source === nodeId) {
            const targetNode = nodesRef.current.find((n) => n.id === edge.target);
            if (targetNode?.data?.branchMetadata?.branchId === branchId && edge.originalStyle) {
              console.log('  🔄 Unhighlighting edge:', edge.id);
              highlightedEdgesRef.current.delete(edge.id);
              return {
                ...edge,
                className: undefined,
                style: {
                  ...edge.originalStyle,
                  stroke: '#666',
                  strokeWidth: edge.originalStyle.strokeWidth || 2,
                },
                originalStyle: undefined,
              };
            }
          }
          return edge;
        })
      );
    };

    window.addEventListener('branchMarkerVisible', handleMarkerVisible);
    window.addEventListener('branchMarkerHidden', handleMarkerHidden);

    return () => {
      window.removeEventListener('branchMarkerVisible', handleMarkerVisible);
      window.removeEventListener('branchMarkerHidden', handleMarkerHidden);
      highlightedEdgesRef.current.clear();
    };
  }, [setEdges]);

  const contextValue = {
    updateNodeData,
    deleteNode,
    addChatNode,
    getConnectedContext,
    apiKeys,
    nodes,
    edges,
  };

  const chatModeNodeData = chatMode ? {
    data: nodes.find(n => n.id === chatMode)?.data || {},
    updateModel: (newModel) => {
      const node = nodes.find(n => n.id === chatMode);
      if (node) {
        // Find the provider for this model
        let newProvider = node.data.provider;
        for (const [providerId, provider] of Object.entries(PROVIDERS)) {
          if (provider.models.some(m => m.id === newModel)) {
            newProvider = providerId;
            break;
          }
        }
        updateNodeData(chatMode, { model: newModel, provider: newProvider });
        // Also update the conversation in the store
        const { updateConversation } = useStore.getState();
        updateConversation(chatMode, { model: newModel, provider: newProvider });
      }
    }
  } : null;

  // Chat window mode - simplified UI with just the chat
  if (isChatWindow && chatMode) {
    return (
      <NodeContext.Provider value={contextValue}>
        <div className="app chat-window-mode" ref={reactFlowWrapper}>
          <ChatMode
            nodeId={chatMode}
            onExit={() => window.close()}
            isChatWindow={true}
          />
        </div>
      </NodeContext.Provider>
    );
  }

  return (
    <NodeContext.Provider value={contextValue}>
      <div className="app" ref={reactFlowWrapper}>
        <Sidebar
          nodes={nodes}
          onLoadSession={handleLoadSession}
          onSaveSession={handleSaveSession}
          onNewSession={handleNewSession}
          onNewChatWithMode={(nodeId, initialNode) => {
            // Set the node on canvas if provided
            if (initialNode) {
              setNodes([initialNode]);
              setEdges([]);
            }
            setChatMode(nodeId);
          }}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDoubleClick={onPaneDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode={['Backspace', 'Delete']}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          noDragClassName="nodrag"
          noWheelClassName="nowheel"
        >
          <Background color="#333" gap={20} />
          <Controls className="controls" />
          <MiniMap
            nodeColor="#22c55e"
            maskColor="rgba(0, 0, 0, 0.8)"
            style={{ background: '#111', width: 150, height: 112 }}
          />
        </ReactFlow>

        {!chatMode && (
          <>
            <div
              className="canvas-node-count"
              style={{
                position: 'fixed',
                top: '64px',
                left: sidebarOpen ? '316px' : '16px',
                zIndex: 3002,
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--sans)',
                transition: 'left 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <input
                type="number"
                min="0"
                max="100"
                value={nodes.length}
                onChange={(e) => {
                  const targetCount = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  const currentCount = nodes.length;
                  if (targetCount > currentCount) {
                    const toAdd = targetCount - currentCount;
                    for (let i = 0; i < toAdd; i++) {
                      setTimeout(() => {
                        const offset = i * 50;
                        addChatNode({ x: 200 + offset, y: 200 + offset });
                      }, i * 10);
                    }
                  }
                }}
                style={{
                  width: '36px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text)',
                  fontSize: '11px',
                  padding: '2px 4px',
                  textAlign: 'center'
                }}
              />
              <span>node{nodes.length !== 1 ? 's' : ''}</span>
            </div>
            <button
              className="toolbar-btn icon-btn canvas-add-btn"
              onClick={() => addChatNode({ x: 200, y: 200 })}
              title="Add Chat Node"
              style={{
                position: 'fixed',
                top: '64px',
                right: '16px',
                zIndex: 3002,
                width: '32px',
                height: '32px'
              }}
            >
              +
            </button>
          </>
        )}

        <Toolbar
          onAddNode={() => addChatNode({ x: 200, y: 200 })}
          chatModeNode={chatModeNodeData}
          onTabClick={handleLoadSession}
        />

        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            currentNode={chatMode ? nodes.find(n => n.id === chatMode) : null}
            onModelChange={(model, provider) => {
              if (chatMode) {
                updateNodeData(chatMode, { model, provider });
              }
            }}
          />
        )}

        {showUpgradePlan && (
          <UpgradePlan onClose={() => setShowUpgradePlan(false)} />
        )}

        {chatMode && (
          <ChatMode
            nodeId={chatMode}
            onExit={() => setChatMode(null)}
          />
        )}
      </div>
    </NodeContext.Provider>
  );
}

export default App;
