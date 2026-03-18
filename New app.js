import React, { useEffect, useState, useRef } from "react";

export default function App() {
  const [layers, setLayers] = useState([]);
  const [data, setData] = useState(null);
  const [root, setRoot] = useState("");
  const [search, setSearch] = useState("");
  const svgRef = useRef();

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

  // 🔥 BUILD LAYERS
  const buildLayers = ({ nodes, links }, rootId) => {
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
    const queue = [{ id: rootId, level: 0 }];
    const result = [];

    while (queue.length) {
      const { id, level } = queue.shift();

      if (visited.has(id)) continue;
      visited.add(id);

      if (!result[level]) result[level] = [];
      result[level].push(map[id]);

      (adj[id] || []).forEach(child =>
        queue.push({ id: child, level: level + 1 })
      );
    }

    setLayers(result);

    // redraw lines after render
    setTimeout(drawLines, 100);
  };

  // 🔍 SEARCH
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

  // 🔥 REAL CONNECTOR DRAWING
  const drawLines = () => {
    const svg = svgRef.current;
    if (!svg || !data) return;

    svg.innerHTML = "";

    const container = document.getElementById("container");

    data.links.forEach(link => {
      const src = link.source.id || link.source;
      const tgt = link.target.id || link.target;

      const srcEl = document.getElementById(`node-${src}`);
      const tgtEl = document.getElementById(`node-${tgt}`);

      if (!srcEl || !tgtEl) return;

      const s = srcEl.getBoundingClientRect();
      const t = tgtEl.getBoundingClientRect();
      const c = container.getBoundingClientRect();

      const x1 = s.right - c.left;
      const y1 = s.top + s.height / 2 - c.top;

      const x2 = t.left - c.left;
      const y2 = t.top + t.height / 2 - c.top;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

      path.setAttribute(
        "d",
        `M${x1},${y1} C${x1 + 80},${y1} ${x2 - 80},${y2} ${x2},${y2}`
      );

      path.setAttribute("stroke", "#b0b7c3");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("fill", "none");

      svg.appendChild(path);
    });
  };

  return (
    <div style={{ padding: "20px", background: "#f5f7fa" }}>
      <h2>Enterprise Dependency Flow</h2>

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

      <div id="container" style={{ position: "relative", display: "flex" }}>
        
        {/* SVG LAYER */}
        <svg
          ref={svgRef}
          style={{
            position: "absolute",
            width: "2000px",
            height: "1000px",
            pointerEvents: "none"
          }}
        />

        {/* COLUMNS */}
        {layers.map((layer, i) => (
          <div key={i} style={{ marginRight: "80px" }}>
            <h4>Level {i}</h4>

            {layer.map(node => (
              <div
                key={node.id}
                id={`node-${node.id}`}
                style={{
                  margin: "40px 0",
                  width: "220px",
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

  function getColor(c) {
    if (c === "HIGH") return "#e53935";
    if (c === "MEDIUM") return "#fb8c00";
    return "#43a047";
  }
}
