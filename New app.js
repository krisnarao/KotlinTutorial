import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [tree, setTree] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [expanded, setExpanded] = useState(new Set());

  // 🚀 LOAD DATA
  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);

        // 🔥 auto-select root with max dependencies
        const counts = {};
        res.links.forEach(l => {
          const src = l.source.id || l.source;
          counts[src] = (counts[src] || 0) + 1;
        });

        const bestRootId = Object.keys(counts)
          .sort((a, b) => counts[b] - counts[a])[0];

        buildTree(res, bestRootId);
      });
  }, []);

  // 🌲 BUILD TREE
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

    setTree(build(rootId));
    setExpanded(new Set([rootId]));
  };

  // 🔍 SEARCH
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

  // 🔁 EXPAND / COLLAPSE
  const toggle = (id) => {
    const newSet = new Set(expanded);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpanded(newSet);
  };

  return (
    <div
      style={{
        padding: "40px",
        background: "#f5f7fa",
        minHeight: "100vh",
        textAlign: "center"
      }}
    >
      <h2>Enterprise Dependency Explorer</h2>

      {/* 🔍 SEARCH */}
      <input
        placeholder="Search ITAM / Name..."
        value={search}
        onChange={e => handleSearch(e.target.value)}
        style={{
          padding: "10px",
          width: "300px",
          marginBottom: "20px"
        }}
      />

      {/* SEARCH RESULTS */}
      {results.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          {results.map(r => (
            <div
              key={r.id}
              onClick={() => {
                buildTree(data, r.id);
                setResults([]);
                setSearch("");
              }}
              style={{
                cursor: "pointer",
                padding: "8px",
                margin: "5px auto",
                width: "300px",
                background: "#fff",
                borderRadius: "6px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
              }}
            >
              {r.name || r.id} ({r.id})
            </div>
          ))}
        </div>
      )}

      {/* 🌲 TREE */}
      <div style={{ marginTop: "20px" }}>
        {tree && renderNode(tree)}
      </div>
    </div>
  );

  // 🌲 RENDER NODE
  function renderNode(node) {
    return (
      <div key={node.id} style={{ textAlign: "center" }}>
        
        {/* CARD */}
        <div
          onClick={() => toggle(node.id)}
          style={{
            width: "320px",
            margin: "0 auto",
            padding: "12px",
            borderRadius: "12px",
            background: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderLeft: `5px solid ${getColor(node.criticality)}`,
            cursor: "pointer"
          }}
        >
          <div style={{ fontWeight: "bold" }}>
            {node.name || node.id}
          </div>

          <div style={{ fontSize: "12px", color: "#666" }}>
            ITAM: {node.id}
          </div>

          <div style={{ fontSize: "12px" }}>
            {node.criticality || "UNKNOWN"}
          </div>

          {/* ✅ show only if has children */}
          {node.children.length > 0 && (
            <div style={{ fontSize: "11px", marginTop: "5px", color: "#888" }}>
              Dependencies: {node.children.length}
            </div>
          )}
        </div>

        {/* 🔥 DOTTED CONNECTOR */}
        {expanded.has(node.id) && node.children.length > 0 && (
          <div
            style={{
              width: "2px",
              height: "35px",
              margin: "0 auto",
              background: "repeating-linear-gradient(to bottom, #bbb, #bbb 4px, transparent 4px, transparent 8px)"
            }}
          />
        )}

        {/* CHILDREN */}
        {expanded.has(node.id) &&
          node.children.map(child => renderNode(child))}
      </div>
    );
  }

  function getColor(c) {
    if (c === "HIGH") return "#e53935";
    if (c === "MEDIUM") return "#fb8c00";
    return "#43a047";
  }
    }
