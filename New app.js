import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [rootNode, setRootNode] = useState(null);
  const [chain, setChain] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);
        const defaultRoot = res.nodes[0];
        setRootNode(defaultRoot);
      });
  }, []);

  // 🔥 BUILD VERTICAL DEPENDENCY
  const buildChain = (rootId) => {
    if (!data) return;

    const map = {};
    data.nodes.forEach(n => (map[n.id] = n));

    const adj = {};
    data.links.forEach(l => {
      const s = l.source.id || l.source;
      const t = l.target.id || l.target;

      if (!adj[s]) adj[s] = [];
      adj[s].push(t);
    });

    const visited = new Set();
    const queue = [rootId];
    const result = [];

    while (queue.length) {
      const curr = queue.shift();

      if (visited.has(curr)) continue;
      visited.add(curr);

      result.push(map[curr]);

      (adj[curr] || []).forEach(child => queue.push(child));
    }

    setChain(result.slice(1)); // exclude root (already shown)
  };

  // 🔍 SEARCH
  const handleSearch = (val) => {
    setSearch(val);

    if (!data) return;

    if (!val) {
      setResults([]);
      setChain([]);
      return;
    }

    const matches = data.nodes.filter(n =>
      n.id.includes(val) ||
      (n.name && n.name.toLowerCase().includes(val.toLowerCase()))
    );

    setResults(matches);
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
      <h2>Dependency Vertical View</h2>

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
                setRootNode(r);
                buildChain(r.id);
                setResults([]);
                setSearch("");
              }}
              style={{
                cursor: "pointer",
                padding: "8px",
                margin: "5px auto",
                width: "300px",
                background: "#fff",
                borderRadius: "6px"
              }}
            >
              {r.name || r.id} ({r.id})
            </div>
          ))}
        </div>
      )}

      {/* ROOT NODE */}
      {rootNode && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Card node={rootNode} />
        </div>
      )}

      {/* 🔥 VERTICAL CHAIN */}
      <div style={{ marginTop: "20px" }}>
        {chain.map((node, i) => (
          <div key={node.id} style={{ textAlign: "center" }}>
            
            {/* LINE */}
            <div
              style={{
                width: "2px",
                height: "40px",
                background: "#ccc",
                margin: "0 auto"
              }}
            />

            {/* CARD */}
            <Card node={node} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 🔥 CARD COMPONENT
function Card({ node }) {
  return (
    <div
      style={{
        width: "320px",
        margin: "0 auto",
        padding: "12px",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        borderLeft: `5px solid ${getColor(node.criticality)}`
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
    </div>
  );
}

function getColor(c) {
  if (c === "HIGH") return "#e53935";
  if (c === "MEDIUM") return "#fb8c00";
  return "#43a047";
}
