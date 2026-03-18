import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [rootNode, setRootNode] = useState(null);
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [blastNodes, setBlastNodes] = useState(new Set());
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);

        const counts = {};
        res.links.forEach(l => {
          const s = l.source.id || l.source;
          counts[s] = (counts[s] || 0) + 1;
        });

        const rootId = Object.keys(counts).sort(
          (a, b) => counts[b] - counts[a]
        )[0];

        const root = res.nodes.find(n => n.id === rootId);
        setRootNode(root);

        buildTree(res, rootId);
      });
  }, []);

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
    setExpanded(new Set([rootId]));

    calculateBlast(rootId, adj);
  };

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

  const handleSearch = (val) => {
    setSearch(val);

    if (!data || !val) {
      setResults([]);
      return;
    }

    const matches = data.nodes.filter(n =>
      n.id.includes(val) ||
      (n.name && n.name.toLowerCase().includes(val.toLowerCase()))
    );

    setResults(matches);
  };

  const toggle = (id) => {
    const newSet = new Set(expanded);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setExpanded(newSet);
  };

  const getRisk = (rating) => {
    if (rating === 5) return { label: "CRITICAL", color: "#b71c1c" };
    if (rating === 4) return { label: "HIGH", color: "#e53935" };
    if (rating === 3) return { label: "MEDIUM", color: "#fb8c00" };
    if (rating === 2) return { label: "LOW", color: "#43a047" };
    return { label: "UNKNOWN", color: "#9e9e9e" };
  };

  return (
    <div style={{ padding: 40, background: "#f5f7fa", minHeight: "100vh", textAlign: "center" }}>
      <h2>Enterprise Dependency Explorer</h2>

      {/* SEARCH */}
      <input
        placeholder="Search ITAM / Name..."
        value={search}
        onChange={e => handleSearch(e.target.value)}
        style={{ padding: 10, width: 300 }}
      />

      {/* SEARCH RESULTS */}
      {results.length > 0 && (
        <div>
          {results.map(r => (
            <div
              key={r.id}
              onClick={() => {
                setRootNode(r);
                buildTree(data, r.id);
                setResults([]);
                setSearch("");
              }}
              style={{
                margin: 5,
                padding: 8,
                background: "#fff",
                cursor: "pointer",
                borderRadius: 6
              }}
            >
              {r.name || r.id} ({r.id})
            </div>
          ))}
        </div>
      )}

      {/* SOURCE */}
      {rootNode && <div style={{ marginTop: 30 }}>{renderSource(rootNode)}</div>}

      {/* CONNECTOR */}
      <div style={{
        height: 30,
        width: 2,
        margin: "10px auto",
        background: "repeating-linear-gradient(to bottom, #bbb, #bbb 4px, transparent 4px, transparent 8px)"
      }} />

      {/* DESTINATION TREE */}
      {tree.map(node => renderNode(node))}
    </div>
  );

  function renderSource(node) {
    const rating = Number(node.rating || node.bcRating || node.criticality);
    const risk = getRisk(rating);

    return (
      <div style={{
        width: 300,
        margin: "0 auto",
        padding: 12,
        borderRadius: 12,
        background: "#e3f2fd",
        borderLeft: `5px solid ${risk.color}`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
      }}>
        <div style={{
          fontSize: 10,
          background: "#1976d2",
          color: "#fff",
          padding: "2px 6px",
          borderRadius: 4,
          display: "inline-block",
          marginBottom: 6
        }}>
          SOURCE
        </div>

        {/* ✅ INLINE NAME + RISK */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold"
        }}>
          <span>{node.name || node.id} ({node.id})</span>

          <span style={{
            fontSize: "11px",
            background: risk.color,
            color: "#fff",
            padding: "3px 8px",
            borderRadius: "10px"
          }}>
            {risk.label} : {rating}
          </span>
        </div>
      </div>
    );
  }

  function renderNode(node) {
    const rating = Number(node.rating || node.bcRating || node.criticality);
    const risk = getRisk(rating);
    const inBlast = blastNodes.has(node.id);

    return (
      <div key={node.id} style={{ textAlign: "center" }}>
        
        {/* CONNECTOR */}
        <div style={{
          height: 30,
          width: 2,
          margin: "0 auto",
          background: "repeating-linear-gradient(to bottom, #bbb, #bbb 4px, transparent 4px, transparent 8px)"
        }} />

        {/* CARD */}
        <div
          onClick={() => toggle(node.id)}
          style={{
            width: 280,
            margin: "0 auto",
            padding: 12,
            borderRadius: 12,
            background: inBlast ? "#ffebee" : "#fff",
            borderLeft: `5px solid ${risk.color}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            cursor: "pointer"
          }}
        >
          <div style={{
            fontSize: 10,
            background: "#757575",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: 4,
            display: "inline-block",
            marginBottom: 6
          }}>
            DESTINATION
          </div>

          {/* ✅ INLINE NAME + RISK */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold"
          }}>
            <span>{node.name || node.id} ({node.id})</span>

            <span style={{
              fontSize: "11px",
              background: risk.color,
              color: "#fff",
              padding: "3px 8px",
              borderRadius: "10px"
            }}>
              {risk.label} : {rating}
            </span>
          </div>

          {node.children.length > 0 && (
            <div style={{ fontSize: 11 }}>
              Dependencies: {node.children.length}
            </div>
          )}
        </div>

        {/* CHILDREN */}
        {expanded.has(node.id) &&
          node.children.map(child => renderNode(child))}
      </div>
    );
  }
}
