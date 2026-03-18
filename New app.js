import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);
  const [tree, setTree] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [hovered, setHovered] = useState(null);
  const [blastNodes, setBlastNodes] = useState(new Set());
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [parentMap, setParentMap] = useState({});

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setData(res);

        const pMap = {};
        res.links.forEach(l => {
          const s = l.source.id || l.source;
          const t = l.target.id || l.target;
          pMap[t] = s;
        });
        setParentMap(pMap);

        const counts = {};
        res.links.forEach(l => {
          const s = l.source.id || l.source;
          counts[s] = (counts[s] || 0) + 1;
        });

        const bestRoot = Object.keys(counts).sort(
          (a, b) => counts[b] - counts[a]
        )[0];

        buildTree(res, bestRoot);
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

    setTree(build(rootId));
    setExpanded(new Set([rootId]));
    calculateBlastRadius(rootId, adj);
  };

  // 🔥 BLAST RADIUS
  const calculateBlastRadius = (rootId, adj) => {
    const affected = new Set();
    const queue = [rootId];

    while (queue.length) {
      const curr = queue.shift();
      affected.add(curr);

      (adj[curr] || []).forEach(child => {
        if (!affected.has(child)) queue.push(child);
      });
    }

    setBlastNodes(affected);
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

  const toggle = (id) => {
    const newSet = new Set(expanded);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setExpanded(newSet);
  };

  // 📊 RISK SCORE
  const getRisk = (count) => {
    if (count >= 10) return { label: "HIGH", color: "#e53935" };
    if (count >= 5) return { label: "MEDIUM", color: "#fb8c00" };
    return { label: "LOW", color: "#43a047" };
  };

  // 📁 EXPORT JSON
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(tree, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dependency-tree.json";
    a.click();
  };

  return (
    <div style={{ padding: 40, background: "#f5f7fa", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center" }}>
        Enterprise Dependency Explorer
      </h2>

      {/* CONTROLS */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <input
          placeholder="Search ITAM / Name..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{ padding: 10, width: 300 }}
        />

        <button
          onClick={exportJSON}
          style={{
            marginLeft: 10,
            padding: "10px 15px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Export JSON
        </button>
      </div>

      {/* SEARCH RESULTS */}
      {results.length > 0 && (
        <div style={{ textAlign: "center" }}>
          {results.map(r => (
            <div
              key={r.id}
              onClick={() => {
                buildTree(data, r.id);
                setSearch("");
                setResults([]);
              }}
              style={{
                padding: 8,
                margin: 5,
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

      <div style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
        {tree && renderNode(tree)}
      </div>
    </div>
  );

  function renderNode(node) {
    const risk = getRisk(node.children.length);
    const inBlast = blastNodes.has(node.id);

    return (
      <div style={{ textAlign: "center" }}>
        
        {/* CARD */}
        <div
          onClick={() => toggle(node.id)}
          style={{
            margin: "0 auto",
            padding: 12,
            width: 240,
            borderRadius: 12,
            background: inBlast ? "#ffebee" : "#fff",
            borderLeft: `5px solid ${risk.color}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            cursor: "pointer"
          }}
        >
          <div style={{ fontWeight: "bold" }}>
            {node.name || node.id}
          </div>

          <div style={{ fontSize: 12 }}>ITAM: {node.id}</div>

          {/* RISK BADGE */}
          <div
            style={{
              fontSize: 11,
              marginTop: 5,
              color: "#fff",
              background: risk.color,
              display: "inline-block",
              padding: "2px 6px",
              borderRadius: 4
            }}
          >
            {risk.label}
          </div>

          {node.children.length > 0 && (
            <div style={{ fontSize: 11 }}>
              Dependencies: {node.children.length}
            </div>
          )}
        </div>

        {/* DOTTED LINE */}
        {expanded.has(node.id) && node.children.length > 0 && (
          <div
            style={{
              height: 30,
              width: 2,
              margin: "0 auto",
              background:
                "repeating-linear-gradient(to bottom, #bbb, #bbb 4px, transparent 4px, transparent 8px)"
            }}
          />
        )}

        {/* CHILDREN */}
        {expanded.has(node.id) && node.children.length > 0 && (
          <div style={{ display: "flex", gap: 40, justifyContent: "center" }}>
            {node.children.map(child => (
              <div key={child.id}>{renderNode(child)}</div>
            ))}
          </div>
        )}
      </div>
    );
  }
                }
