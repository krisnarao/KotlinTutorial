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

  const drawTree = ({ nodes, links }) => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight;

    const g = svg.append("g").attr("transform", "translate(100,50)");

    // 🔥 Build Tree
    const map = {};
    const childrenSet = new Set();

    nodes.forEach(n => {
      map[n.id] = { ...n, children: [] };
    });

    links.forEach(l => {
      const src = l.source.id || l.source;
      const tgt = l.target.id || l.target;

      if (map[src] && map[tgt]) {
        map[src].children.push(map[tgt]);
        childrenSet.add(tgt);
      }
    });

    // Root detection
    let rootNode = nodes.find(n => !childrenSet.has(n.id));
    if (!rootNode) rootNode = nodes[0];

    const root = d3.hierarchy(map[rootNode.id]);

    // 🔥 Tree Layout (Vertical)
    const treeLayout = d3.tree()
      .size([height - 100, width - 300]);

    treeLayout(root);

    // Links
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

    // Nodes
    const node = g.selectAll("g.node")
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
      <h3 style={{ padding: "10px" }}>Vertical Dependency Tree</h3>
      <svg ref={ref} width="100%" height="90vh"></svg>
    </div>
  );
}
