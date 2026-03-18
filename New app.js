import React, { useEffect, useState } from "react";

export default function App() {
  const [layers, setLayers] = useState([]);
  const [data, setData] = useState(null);
  const [root, setRoot] = useState("");

  const COL_WIDTH = 300;
  const ROW_HEIGHT = 110;

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);

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

  return (
    <div style={{ padding: "20px", background: "#f5f7fa" }}>
      <h2>Enterprise Dependency Flow</h2>

      {/* ROOT INPUT */}
      <input
        value={root}
        onChange={e => {
          setRoot(e.target.value);
          buildLayers(data, e.target.value);
        }}
        style={{ padding: "8px", marginBottom: "20px" }}
      />

      <div style={{ position: "relative", display: "flex" }}>
        
        {/* 🔗 CONNECTOR SVG */}
        <svg
          width={2000}
          height={1000}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {drawConnections(layers, data?.links || [])}
        </svg>

        {/* 🧱 COLUMNS */}
        {layers.map((layer, colIndex) => (
          <div key={colIndex} style={{ width: COL_WIDTH }}>
            <h4 style={{ textAlign: "center" }}>Level {colIndex}</h4>

            {layer.map((node, rowIndex) => (
              <div
                key={node.id}
                style={{
                  position: "absolute",
                  left: colIndex * COL_WIDTH + 20,
                  top: rowIndex * ROW_HEIGHT + 80,
                  width: 220,
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

  // 🔥 PERFECT CONNECTORS
  function drawConnections(layers, links) {
    const paths = [];

    const linkSet = new Set();
    links.forEach(l => {
      const s = l.source.id || l.source;
      const t = l.target.id || l.target;
      linkSet.add(`${s}->${t}`);
    });

    layers.forEach((layer, i) => {
      if (i === layers.length - 1) return;

      layer.forEach((parent, pi) => {
        const x1 = i * COL_WIDTH + 240;
        const y1 = pi * ROW_HEIGHT + 100;

        layers[i + 1].forEach((child, ci) => {
          const x2 = (i + 1) * COL_WIDTH + 20;
          const y2 = ci * ROW_HEIGHT + 100;

          if (linkSet.has(`${parent.id}->${child.id}`)) {
            paths.push(
              <path
                key={`${parent.id}-${child.id}`}
                d={`M${x1},${y1} C${x1 + 80},${y1} ${x2 - 80},${y2} ${x2},${y2}`}
                stroke="#b0b7c3"
                strokeWidth="2"
                fill="none"
              />
            );
          }
        });
      });
    });

    return paths;
  }

  function getColor(c) {
    if (c === "HIGH") return "#e53935";
    if (c === "MEDIUM") return "#fb8c00";
    return "#43a047";
  }
}
