import React, { useEffect, useState } from "react";

export default function App() {
  const [layers, setLayers] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => buildLayers(res));
  }, []);

  // 🔥 BUILD LAYERS (BFS)
  const buildLayers = ({ nodes, links }) => {
    const map = {};
    nodes.forEach(n => (map[n.id] = n));

    const adj = {};
    links.forEach(l => {
      const src = l.source.id || l.source;
      const tgt = l.target.id || l.target;

      if (!adj[src]) adj[src] = [];
      adj[src].push(tgt);
    });

    const root = nodes[0].id; // or choose specific ITAM
    const visited = new Set();
    const queue = [{ id: root, level: 0 }];

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

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dependency Flow View</h2>

      <div style={{ display: "flex", gap: "40px", overflowX: "auto" }}>
        {layers.map((layer, i) => (
          <div key={i}>
            <h4>Level {i}</h4>

            {layer.map((node, j) => (
              <div
                key={j}
                style={{
                  margin: "20px 0",
                  padding: "10px",
                  minWidth: "150px",
                  borderRadius: "10px",
                  background: "#fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  borderLeft: `5px solid ${getColor(node.criticality)}`
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
      </div>
    </div>
  );

  function getColor(c) {
    if (c === "HIGH") return "red";
    if (c === "MEDIUM") return "orange";
    return "green";
  }
}
