import React, { useEffect, useState, useRef } from "react";

export default function App() {
  const [layers, setLayers] = useState([]);
  const [data, setData] = useState(null);
  const [root, setRoot] = useState("");
  const [search, setSearch] = useState("");
  const containerRef = useRef();

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);

        // auto root
        const counts = {};
        res.links.forEach(l => {
          const src = l.source.id || l.source;
          counts[src] = (counts[src] || 0) + 1;
        });

        const bestRoot = Object.keys(counts)
          .sort((a, b) => counts[b] - counts[a])[0];

        setRoot(bestRoot);
        buildLayers(res, bestRoot);
      });
  }, []);

  const buildLayers = ({ nodes, links }, rootId) => {
    const map = {};
    nodes.forEach(n => (map[n.id] = n));

    const adj = {};
    links.forEach(l => {
      const src = l.source.id || l.source;
      const tgt = l.target.id || l.target;

      if (!adj[src]) adj[src] = [];
      adj[src].push(tgt);
    });

    const visited = new Set();
    const queue = [{ id: rootId, level: 0 }];
    const result = [];

    while (queue.length) {
      const { id, level } = queue.shift();

      if (visited.has(id)) continue;
      visited.add(id);

      if (!result[level]) result[level] = [];
      result[level].push(map[id]);

      (adj[id] || []).forEach(child => {
        queue.push({ id: child, level: level + 1 });
      });
    }

    setLayers(result);
  };

  // 🔍 SEARCH HANDLER
  const handleSearch = (val) => {
    setSearch(val);

    if (!data) return;

    const match = data.nodes.find(
      n =>
        n.id.includes(val) ||
        (n.name && n.name.toLowerCase().includes(val.toLowerCase()))
    );

    if (match) {
      setRoot(match.id);
      buildLayers(data, match.id);
    }
  };

  const handleRootChange = (e) => {
    const val = e.target.value;
    setRoot(val);
    buildLayers(data, val);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dependency Flow View</h2>

      {/* 🔍 SEARCH */}
      <div style={{ marginBottom: "10px" }}>
        <input
          placeholder="Search ITAM / Name..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{ padding: "8px", width: "300px", marginRight: "10px" }}
        />

        <input
          placeholder="Root ITAM"
          value={root}
          onChange={handleRootChange}
          style={{ padding: "8px", width: "200px" }}
        />
      </div>

      {/* FLOW */}
      <div
        ref={containerRef}
        style={{
          display: "flex",
          gap: "60px",
          overflowX: "auto",
          position: "relative"
        }}
      >
        {layers.map((layer, i) => (
          <div key={i} style={{ position: "relative" }}>
            <h4>Level {i}</h4>

            {layer.map((node, j) => (
              <div
                key={j}
                id={`node-${node.id}`}
                style={{
                  margin: "30px 0",
                  padding: "12px",
                  minWidth: "180px",
                  borderRadius: "12px",
                  background: "#fff",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                  borderLeft: `6px solid ${getColor(node.criticality)}`
                }}
              >
                <div style={{ fontWeight: "bold" }}>
                  {node.name || node.id}
                </div>

                <div style={{ fontSize: "12px", color: "#555" }}>
                  {node.id}
                </div>

                <div style={{ fontSize: "12px" }}>
                  {node.criticality || "UNKNOWN"}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* 🔗 CONNECTOR LINES (SVG OVERLAY) */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "2000px",
            height: "1000px",
            pointerEvents: "none"
          }}
        >
          {drawConnections(layers)}
        </svg>
      </div>
    </div>
  );

  function drawConnections(layers) {
    const lines = [];

    for (let i = 0; i < layers.length - 1; i++) {
      layers[i].forEach(parent => {
        layers[i + 1].forEach(child => {
          // simple visual connection (can be refined)
          lines.push(
            <line
              key={`${parent.id}-${child.id}`}
              x1={i * 250 + 200}
              y1={50 + Math.random() * 300}
              x2={(i + 1) * 250 + 50}
              y2={50 + Math.random() * 300}
              stroke="#ccc"
              strokeWidth="2"
            />
          );
        });
      });
    }

    return lines;
  }

  function getColor(c) {
    if (c === "HIGH") return "red";
    if (c === "MEDIUM") return "orange";
    return "green";
  }
          }
