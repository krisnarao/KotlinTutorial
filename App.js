
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function App() {
  const svgRef = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (data) drawGraph(data);
  }, [data]);

  const drawGraph = ({ nodes, links }) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight;

    const g = svg.append("g");

    // Zoom
    svg.call(
      d3.zoom().scaleExtent([0.5, 5]).on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
    );

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40)); // prevents overlap

    // Links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#aaa")
      .attr("opacity", 0.6);

    // Nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 10)
      .attr("fill", d => getColor(d.criticality))
      .on("click", (_, d) => highlightBlast(d.id, nodes, links, node, link))
      .on("mouseover", (_, d) => showTooltip(d))
      .on("mouseout", hideTooltip)
      .call(
        d3.drag()
          .on("start", dragStart)
          .on("drag", dragging)
          .on("end", dragEnd)
      );

    // Labels
    const label = g.append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text(d => d.name || d.id)
      .attr("fontSize", 10);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      label
        .attr("x", d => d.x + 12)
        .attr("y", d => d.y);
    });

    // Drag functions
    function dragStart(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragging(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnd(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Tooltip
    function showTooltip(d) {
      const tooltip = document.getElementById("tooltip");
      tooltip.style.display = "block";
      tooltip.innerHTML = `
        <b>${d.name}</b><br/>
        ITAM: ${d.id}<br/>
        Criticality: ${d.criticality || "N/A"}
      `;
    }

    function hideTooltip() {
      document.getElementById("tooltip").style.display = "none";
    }
  };

  // Blast radius
  const highlightBlast = (id, nodes, links, nodeSel, linkSel) => {
    const visited = new Set();
    const queue = [id];

    while (queue.length) {
      const curr = queue.shift();
      visited.add(curr);

      links.forEach(l => {
        const src = l.source.id || l.source;
        const tgt = l.target.id || l.target;

        if (src === curr && !visited.has(tgt)) {
          queue.push(tgt);
        }
      });
    }

    nodeSel.attr("opacity", d => (visited.has(d.id) ? 1 : 0.1));

    linkSel.attr("stroke", d => {
      const src = d.source.id || d.source;
      return visited.has(src) ? "red" : "#ccc";
    });
  };

  const getColor = (c) => {
    if (c === "HIGH") return "red";
    if (c === "MEDIUM") return "orange";
    return "green";
  };

  return (
    <div>
      <div style={{ padding: "10px" }}>
        🔍 Search:
        <input
          onChange={(e) => searchNode(e.target.value)}
          placeholder="Enter ITAM"
        />
      </div>

      <div
        id="tooltip"
        style={{
          position: "absolute",
          background: "#333",
          color: "#fff",
          padding: "5px",
          display: "none"
        }}
      />

      <svg ref={svgRef} width="100%" height="90vh"></svg>
    </div>
  );

  function searchNode(val) {
    d3.selectAll("circle")
      .attr("stroke", d => (d.id === val ? "black" : null))
      .attr("strokeWidth", d => (d.id === val ? 3 : 1));
  }
}
