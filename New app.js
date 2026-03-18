import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [chain, setChain] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);
        buildChain(res, res.nodes[0].id); // default
      });
  }, []);

  // 🔥 BUILD VERTICAL CHAIN (BFS LINEARIZED)
  const buildChain = ({ nodes, links }, rootId) => {
    const map = {};
    nodes.forEach(n => (map[n.id] = n));

    const adj = {};
    links.forEach(l => {
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

    setChain(result);
  };

  // 🔍 SEARCH (RETURN MULTIPLE MATCHES)
  const handleSearch = (val) => {
    setSearch(val);

    if (!data) return;

    if (!val) {
      setResults([]);
      return;
    }

    const matches = data.nodes.filter(n =>
      n.id.includes(val) ||
      (n.name && n.name.toLowerCase().includes(val.toLowerCase()))
    );

    setResults(matches);
  };

  return (
    <div style={{ padding: "20px", background: "#f5f7fa" }}>
      <h2>Dependency Vertical View</h2>

      {/* 🔍 SEARCH */}
      <input
        placeholder="Search ITAM / Name..."
        value={search}
        onChange={e => handleSearch(e.target.value)}
        style={{ padding: "10px", width: "300px" }}
      />

      {/* 🔍 SEARCH RESULTS */}
      {results.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <b>Results:</b>
          {results.map(r => (
            <div
              key={r.id}
              onClick={() => {
                buildChain(data, r.id);
                setResults([]);
              }}
              style={{
                padding: "8px",
                cursor: "pointer",
                background: "#fff",
                margin: "5px 0",
                borderRadius: "6px"
              }}
            >
              {r.name || r.id} ({r.id})
            </div>
          ))}
        </div>
      )}

      {/* 🔥 VERTICAL FLOW */}
      <div style={{ marginTop: "30px", marginLeft: "50px" }}>
        {chain.map((node, i) => (
          <div key={node.id} style={{ position: "relative" }}>
            
            {/* CARD */}
            <div
              style={{
                width: "300px",
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

            {/* 🔥 VERTICAL LINE */}
            {i !== chain.length - 1 && (
              <div
                style={{
                  width: "2px",
                  height: "40px",
                  background: "#ccc",
                  marginLeft: "150px"
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  function getColor(c) {
    if (c === "HIGH") return "#e53935";
    if (c === "MEDIUM") return "#fb8c00";
    return "#43a047";
  }
}
