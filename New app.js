import React, { useEffect, useState } from "react";

export default function App() {
  const [layers, setLayers] = useState([]);
  const [data, setData] = useState(null);
  const [root, setRoot] = useState("");

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);

        // 🔥 AUTO PICK BEST ROOT (max outgoing edges)
        const counts = {};
        res.links.forEach(l => {
          const src = l.source.id || l.source;
          counts[src] = (counts[src] || 0) + 1;
        });

        const bestRoot = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];

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

    console.log("LAYERS:", result); // 👈 DEBUG
    setLayers(result);
  };

  const handleRootChange = (e) => {
    const newRoot = e.target.value;
    setRoot(newRoot);
    buildLayers(data, newRoot);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dependency Flow View</h2>

      {/* 🔥 ROOT SELECTOR */}
      <div style={{ marginBottom: "20px" }}>
        <b>Select Root ITAM:</b>{" "}
        <input
          value={root}
          onChange={handleRootChange}
          placeholder="Enter ITAM"
        />
      </div>

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
                  minWidth: "180px",
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
