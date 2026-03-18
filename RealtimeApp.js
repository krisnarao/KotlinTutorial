import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [rootNode, setRootNode] = useState(null);
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [blastNodes, setBlastNodes] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [criticalPathMode, setCriticalPathMode] = useState(false);

  // 🔄 AUTO REFRESH EVERY 10s
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);

        const counts = {};
        res.links.forEach(l => {
          const s = l.source.id || l.source;
          counts[s] = (counts[s] || 0) + 1;
        });

        const rootId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
        const root = res.nodes.find(n => n.id === rootId);

        setRootNode(root);
        buildTree(res, rootId);
      });
  };

  const buildTree = (data, rootId) => {
    const map = {};
    data.nodes.forEach(n => (map[n.id] = { ...n, children: [] }));

    const adj = {};
    data.links.forEach(l => {
      const s = l.source.id || l.source;
      const t = l.target.id || l.target;

      if (!adj[s]) adj[s] = [];
      adj[s].push(t);
    });

    const visited = new Set();

    const build = (id) => {
      if (visited.has(id)) return null;
      visited.add(id);

      const node = map[id];
      node.children = (adj[id] || [])
        .map(child => build(child))
        .filter(Boolean);

      return node;
    };

    const rootTree = build(rootId);
    setTree(rootTree?.children || []);

    calculateBlast(rootId, adj);
  };

  // 🔥 BLAST RADIUS
  const calculateBlast = (rootId, adj) => {
    const affected = new Set();
    const queue = [rootId];

    while (queue.length) {
      const curr = queue.shift();
      affected.add(curr);
      (adj[curr] || []).forEach(c => {
        if (!affected.has(c)) queue.push(c);
      });
    }

    setBlastNodes(affected);
  };

  const getRisk = (rating) => {
    if (rating === 5) return { label: "CRITICAL", color: "#b71c1c" };
    if (rating === 4) return { label: "HIGH", color: "#e53935" };
    if (rating === 3) return { label: "MEDIUM", color: "#fb8c00" };
    if (rating === 2) return { label: "LOW", color: "#43a047" };
    return { label: "UNKNOWN", color: "#9e9e9e" };
  };

  const isCritical = (rating) => rating >= 4;

  return (
    <div style={{ padding: 40, background: "#f5f7fa", minHeight: "100vh" }}>

      <h2 style={{ textAlign: "center" }}>Enterprise Dependency Explorer</h2>

      {/* 🔥 TOP DASHBOARD */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 15,
        marginBottom: 20
      }}>
        <div style={{
          padding: 10,
          background: "#fff",
          borderRadius: 8
        }}>
          🔥 Blast Radius: {blastNodes.size}
        </div>

        <button onClick={() => setCriticalOnly(!criticalOnly)}>
          {criticalOnly ? "Critical Only ON" : "Critical Only OFF"}
        </button>

        <button onClick={() => setCriticalPathMode(!criticalPathMode)}>
          {criticalPathMode ? "Critical Path ON" : "Critical Path OFF"}
        </button>
      </div>

      {/* SOURCE */}
      {rootNode && renderSource(rootNode)}

      {/* CONNECTOR */}
      <div style={{
        height: 30,
        width: 2,
        margin: "10px auto",
        background: "repeating-linear-gradient(to bottom, #bbb, #bbb 4px, transparent 4px, transparent 8px)"
      }} />

      {/* TREE */}
      {tree.map(node => renderNode(node))}

      {/* HOVER PANEL */}
      {hoverNode && (
        <div style={{
          position: "fixed",
          right: 20,
          top: 100,
          width: 250,
          padding: 15,
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}>
          <h4>{hoverNode.name}</h4>
          <p>ITAM: {hoverNode.id}</p>
          <p>Risk: {getRisk(hoverNode.rating).label}</p>
          <p>Dependencies: {hoverNode.children?.length || 0}</p>
          <p>Blast: {blastNodes.has(hoverNode.id) ? "YES" : "NO"}</p>
        </div>
      )}
    </div>
  );

  function renderSource(node) {
    const rating = Number(node.rating || node.bcRating);
    const risk = getRisk(rating);

    return (
      <div
        onMouseEnter={() => setHoverNode(node)}
        onMouseLeave={() => setHoverNode(null)}
        style={{
          width: 300,
          margin: "0 auto",
          padding: 12,
          borderRadius: 12,
          background: "#e3f2fd",
          borderLeft: `5px solid ${risk.color}`,
          textAlign: "center"
        }}
      >
        <div style={{ background: "#1976d2", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>
          SOURCE
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{node.name} ({node.id})</span>
          <span style={{ background: risk.color, color: "#fff", padding: "3px 8px", borderRadius: 10 }}>
            {risk.label} : {rating}
          </span>
        </div>
      </div>
    );
  }

  function renderNode(node) {
    const rating = Number(node.rating || node.bcRating);
    const risk = getRisk(rating);

    if (criticalOnly && !isCritical(rating)) return null;

    const faded = criticalPathMode && !isCritical(rating);

    return (
      <div key={node.id} style={{
        textAlign: "center",
        opacity: faded ? 0.3 : 1
      }}>
        
        <div style={{
          height: 25,
          width: 2,
          margin: "0 auto",
          background: "repeating-linear-gradient(to bottom, #bbb, #bbb 4px, transparent 4px, transparent 8px)"
        }} />

        <div
          onMouseEnter={() => setHoverNode(node)}
          onMouseLeave={() => setHoverNode(null)}
          style={{
            width: 280,
            margin: "0 auto",
            padding: 12,
            borderRadius: 12,
            background: "#fff",
            borderLeft: `5px solid ${risk.color}`
          }}
        >
          <div style={{ background: "#757575", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>
            DESTINATION
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{node.name} ({node.id})</span>
            <span style={{ background: risk.color, color: "#fff", padding: "3px 8px", borderRadius: 10 }}>
              {risk.label} : {rating}
            </span>
          </div>

          {node.children.length > 0 && (
            <div style={{ fontSize: 11 }}>
              Dependencies: {node.children.length}
            </div>
          )}
        </div>

        {node.children.map(child => renderNode(child))}
      </div>
    );
  }
        }
