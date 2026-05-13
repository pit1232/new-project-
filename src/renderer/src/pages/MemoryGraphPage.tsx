import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Brain, Plus, Trash2, Link, Save, RefreshCw } from 'lucide-react'

interface MemoryNode {
  id: string
  type: 'person' | 'project' | 'topic' | 'file' | 'task' | 'memory'
  label: string
  data?: string
  createdAt: number
}

interface MemoryEdge {
  id: string
  source: string
  target: string
  label?: string
}

const nodeColors: Record<string, string> = {
  person: '#10b981',
  project: '#06b6d4',
  topic: '#8b5cf6',
  file: '#f59e0b',
  task: '#ef4444',
  memory: '#ec4899'
}

function MemoryGraphPage(): React.ReactElement {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeType, setNewNodeType] = useState<string>('topic')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  // Load graph from store
  useEffect(() => {
    loadGraph()
  }, [])

  const loadGraph = async () => {
    try {
      const savedNodes = await window.api.store.get('memory_graph_nodes')
      const savedEdges = await window.api.store.get('memory_graph_edges')

      if (savedNodes && Array.isArray(savedNodes)) {
        const flowNodes: Node[] = savedNodes.map((n: MemoryNode, i: number) => ({
          id: n.id,
          position: { x: 200 + (i % 5) * 200, y: 100 + Math.floor(i / 5) * 150 },
          data: {
            label: (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: nodeColors[n.type] || '#10b981' }}
                />
                <span className="text-xs font-medium">{n.label}</span>
              </div>
            )
          },
          style: {
            background: 'rgba(0,0,0,0.6)',
            border: `1px solid ${nodeColors[n.type] || '#10b981'}40`,
            borderRadius: '12px',
            padding: '8px 12px',
            color: 'white',
            fontSize: '12px',
            backdropFilter: 'blur(8px)'
          }
        }))
        setNodes(flowNodes)
      }

      if (savedEdges && Array.isArray(savedEdges)) {
        const flowEdges: Edge[] = savedEdges.map((e: MemoryEdge) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label || '',
          style: { stroke: '#10b98150' },
          labelStyle: { fill: '#ffffff60', fontSize: '10px' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#10b98150' }
        }))
        setEdges(flowEdges)
      }

      // Add default center node if empty
      if (!savedNodes || savedNodes.length === 0) {
        const defaultNodes: Node[] = [
          {
            id: 'kuldeep',
            position: { x: 400, y: 300 },
            data: {
              label: (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium">Kuldeep (You)</span>
                </div>
              )
            },
            style: {
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '12px',
              padding: '10px 14px',
              color: 'white',
              fontSize: '12px',
              backdropFilter: 'blur(8px)'
            }
          },
          {
            id: 'mmb-ai',
            position: { x: 400, y: 150 },
            data: {
              label: (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span className="text-xs font-medium">MMB AI Project</span>
                </div>
              )
            },
            style: {
              background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.3)',
              borderRadius: '12px',
              padding: '8px 12px',
              color: 'white',
              fontSize: '12px',
              backdropFilter: 'blur(8px)'
            }
          }
        ]
        const defaultEdges: Edge[] = [
          {
            id: 'e-kuldeep-mmb',
            source: 'kuldeep',
            target: 'mmb-ai',
            label: 'co-founder',
            style: { stroke: '#10b98150' },
            labelStyle: { fill: '#ffffff60', fontSize: '10px' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b98150' }
          }
        ]
        setNodes(defaultNodes)
        setEdges(defaultEdges)
      }
    } catch (e) {
      console.error('Failed to load graph:', e)
    }
  }

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        style: { stroke: '#10b98150' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b98150' }
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  const addNode = () => {
    if (!newNodeLabel.trim()) return

    const id = `node-${Date.now()}`
    const color = nodeColors[newNodeType] || '#10b981'

    const newNode: Node = {
      id,
      position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 400 },
      data: {
        label: (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs font-medium">{newNodeLabel}</span>
          </div>
        )
      },
      style: {
        background: 'rgba(0,0,0,0.6)',
        border: `1px solid ${color}40`,
        borderRadius: '12px',
        padding: '8px 12px',
        color: 'white',
        fontSize: '12px',
        backdropFilter: 'blur(8px)'
      }
    }

    setNodes((nds) => [...nds, newNode])
    setNewNodeLabel('')
    setShowAddPanel(false)
  }

  const saveGraph = async () => {
    try {
      const memoryNodes: MemoryNode[] = nodes.map((n) => ({
        id: n.id,
        type: 'topic',
        label: n.id,
        createdAt: Date.now()
      }))
      const memoryEdges: MemoryEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : ''
      }))
      await window.api.store.set('memory_graph_nodes', memoryNodes)
      await window.api.store.set('memory_graph_edges', memoryEdges)
    } catch (e) {
      console.error('Failed to save graph:', e)
    }
  }

  const clearGraph = () => {
    setNodes([])
    setEdges([])
    window.api.store.delete('memory_graph_nodes')
    window.api.store.delete('memory_graph_edges')
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="text-emerald-400" size={20} />
          <h1 className="text-lg font-semibold text-white/90">Memory Graph</h1>
          <span className="text-xs text-white/30 font-mono">
            ({nodes.length} nodes, {edges.length} edges)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
          >
            <Plus size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={saveGraph}
            className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25"
            title="Save graph"
          >
            <Save size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearGraph}
            className="p-2 rounded-lg hover:bg-red-500/15 text-white/40 hover:text-red-400"
            title="Clear graph"
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
      </div>

      {/* Add Node Panel */}
      {showAddPanel && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass rounded-xl p-4 flex items-center gap-3"
        >
          <select
            value={newNodeType}
            onChange={(e) => setNewNodeType(e.target.value)}
            className="bg-white/5 rounded-lg px-3 py-2 text-xs text-white/80 outline-none border border-white/5"
          >
            <option value="person">Person</option>
            <option value="project">Project</option>
            <option value="topic">Topic</option>
            <option value="file">File</option>
            <option value="task">Task</option>
            <option value="memory">Memory</option>
          </select>
          <input
            value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNode()}
            placeholder="Node label..."
            className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none border border-white/5"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addNode}
            className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm hover:bg-emerald-500/25"
          >
            Add
          </motion.button>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(nodeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-mono text-white/40 uppercase">{type}</span>
          </div>
        ))}
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 rounded-xl overflow-hidden border border-white/5">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          style={{ background: '#030303' }}
          defaultEdgeOptions={{
            style: { stroke: '#10b98140' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b98140' }
          }}
        >
          <Controls
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px'
            }}
          />
          <Background color="#10b98110" gap={20} />
        </ReactFlow>
      </div>
    </div>
  )
}

export default MemoryGraphPage
