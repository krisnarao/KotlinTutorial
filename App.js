import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

export default function App() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const svgRef = useRef();

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => setRows(transform(res)));
  }, []);

  useEffect(() => {
    if (selected) drawGraph(selected);
  }, [selected]);

  const transform = ({ nodes, links }) => {
    const map = {};
    nodes.forEach(n => (map[n.id] = n));

    return links.map(l => {
      const src = l.source.id || l.source;
      const tgt = l.target.id || l.target;

      return {
        source: src,
        target: tgt,
        name: map[tgt]?.name || "",
        criticality: map[tgt]?.criticality || "UNKNOWN"
      };
    });
  };

  const drawGraph = (selectedRow) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 500;
    const height = 500;

    const g = svg.append("g");

    const nodes = [
      { id: selectedRow.source },
      { id: selectedRow.target, criticality: selectedRow.criticality }
    ];

    const links = [
      { source: selectedRow.source, target: selectedRow.target }
    ];

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#aaa");

    const node = g.selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 12)
      .attr("fill", d => getColor(d.criticality));

    const label = g.selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text(d => d.id)
      .attr("fontSize", 12);

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
        .attr("x", d => d.x + 10)
        .attr("y", d => d.y);
    });
  };

  const getColor = (c) => {
    if (c === "HIGH") return "red";
    if (c === "MEDIUM") return "orange";
    return "green";
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* LEFT TABLE */}
      <div style={{ width: "50%", overflow: "auto", padding: "10px" }}>
        <h3>Dependency Table</h3>

        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Source</th>
              <th>Destination</th>
              <th>Name</th>
              <th>Criticality</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i} onClick={() => setSelected(r)} style={{ cursor: "pointer" }}>
                <td>{r.source}</td>
                <td>{r.target}</td>
                <td>{r.name}</td>
                <td style={{ color: getColor(r.criticality) }}>
                  {r.criticality}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RIGHT GRAPH */}
      <div style={{ width: "50%", borderLeft: "1px solid #ccc" }}>
        <h3 style={{ padding: "10px" }}>Dependency Graph</h3>
        <svg ref={svgRef} width="100%" height="90%"></svg>
      </div>

    </div>
  );
}
