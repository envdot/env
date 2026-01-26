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
  const { showSettings, setShowSettings, showUpgradePlan, setShowUpgradePlan, apiKeys } = useStore();

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

  const handleLoadSession = useCallback((session) => {
    const currentCanvasNodes = currentNodesRef.current || [];
    const isSameSession = activeChatSession === session.id;

    // Save current session before switching
    if (activeChatSession && !isSameSession) {
      handleSaveSession(activeChatSession);
    }

    // Determine which nodes to use for chat mode
    let nodesToUse;
    if (isSameSession) {
      // Same session: use canvas nodes if session.nodes is empty (not yet saved)
      nodesToUse = (session.nodes && session.nodes.length > 0) ? session.nodes : currentCanvasNodes;
    } else {
      // Different session: always use the session's saved nodes
      nodesToUse = session.nodes || [];
      // Load the session's nodes and edges onto canvas
      setNodes(nodesToUse);
      setEdges(session.edges || []);
    }

    // Enter chat mode with the first node
    if (nodesToUse.length > 0) {
      setChatMode(nodesToUse[0].id);
    }
  }, [setNodes, setEdges, activeChatSession, handleSaveSession, setChatMode]);

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
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, activeChatSession, handleSaveSession]);

  // Initialize with chat mode on first load
  useEffect(() => {
    if (!initializedRef.current && chatSessions.length === 0 && nodes.length === 0) {
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
  }, [chatSessions.length, nodes.length, addChatSession, setActiveChatSession, setNodes, setChatMode]);

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
                transition: 'left 0.3s ease'
              }}
            >
              {nodes.length} node{nodes.length !== 1 ? 's' : ''}
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
