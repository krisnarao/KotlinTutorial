import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function App() {
  const ref = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (data) drawTree(data);
  }, [data]);

  const buildSafeTree = (nodes, links) => {
    const map = {};
    nodes.forEach(n => {
      map[n.id] = { ...n, children: [] };
    });

    // adjacency list
    const adj = {};
    links.forEach(l => {
      const src = l.source.id || l.source;
      const tgt = l.target.id || l.target;

      if (!adj[src]) adj[src] = [];
      adj[src].push(tgt);
    });

    // pick root (or force one)
    const rootId = nodes[0].id;

    // BFS with visited protection
    const visited = new Set();

    const build = (id) => {
      if (visited.has(id)) return null; // prevent loop
      visited.add(id);

      const node = map[id];
      const children = adj[id] || [];

      node.children = children
        .map(childId => build(childId))
        .filter(c => c !== null);

      return node;
    };

    return build(rootId);
  };

  const drawTree = ({ nodes, links }) => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 700;

    const g = svg.append("g").attr("transform", "translate(100,50)");

    // 🔥 SAFE TREE
    const treeData = buildSafeTree(nodes, links);

    const root = d3.hierarchy(treeData);

    const treeLayout = d3.tree().size([height - 100, width - 300]);
    treeLayout(root);

    // links
    g.selectAll("path")
      .data(root.links())
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2)
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
      );

    // nodes
    const node = g.selectAll("g")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
      .attr("r", 6)
      .attr("fill", d => getColor(d.data.criticality));

    node.append("text")
      .attr("dx", 10)
      .attr("dy", 4)
      .text(d => d.data.name || d.data.id)
      .style("font-size", "12px");
  };

  const getColor = (c) => {
    if (c === "HIGH") return "red";
    if (c === "MEDIUM") return "orange";
    return "green";
  };

  return (
    <div>
      <h3 style={{ padding: "10px" }}>Safe Vertical Dependency Tree</h3>
      <svg ref={ref} width="1200" height="700"></svg>
    </div>
  );
}
