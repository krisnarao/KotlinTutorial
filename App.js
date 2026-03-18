import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function App() {
  const ref = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        console.log("API DATA:", res); // 👈 DEBUG
        setData(res);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (data && data.nodes && data.links) {
      drawTree(data);
    }
  }, [data]);

  const drawTree = ({ nodes, links }) => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 700;

    const g = svg.append("g").attr("transform", "translate(100,50)");

    // 🔥 STEP 1: Create map
    const nodeMap = {};
    nodes.forEach(n => {
      nodeMap[n.id] = { ...n, children: [] };
    });

    // 🔥 STEP 2: Build parent-child
    const childSet = new Set();

    links.forEach(l => {
      const src = typeof l.source === "object" ? l.source.id : l.source;
      const tgt = typeof l.target === "object" ? l.target.id : l.target;

      if (nodeMap[src] && nodeMap[tgt]) {
        nodeMap[src].children.push(nodeMap[tgt]);
        childSet.add(tgt);
      }
    });

    // 🔥 STEP 3: Find root safely
    let rootNode = nodes.find(n => !childSet.has(n.id));

    if (!rootNode) {
      console.warn("No root found, using first node");
      rootNode = nodes[0];
    }

    const rootData = nodeMap[rootNode.id];

    // 🔥 STEP 4: Build hierarchy
    const root = d3.hierarchy(rootData);

    // 🔥 STEP 5: Layout
    const treeLayout = d3.tree()
      .size([height - 100, width - 300]);

    treeLayout(root);

    // 🔥 LINKS
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

    // 🔥 NODES
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
      <h3 style={{ padding: "10px" }}>Vertical Dependency Tree</h3>
      <svg ref={ref} width="1200" height="700"></svg>
    </div>
  );
}
