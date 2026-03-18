import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

export default function App() {
  const [rows, setRows] = useState([]);
  const [allData, setAllData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const svgRef = useRef();

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        setAllData(res);
        setRows(transform(res));
      });
  }, []);

  useEffect(() => {
    if (selected && allData) drawGraph(selected, allData);
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

  // 🔥 MULTI-HOP GRAPH (BFS)
  const buildGraph = (rootId, links, nodesMap) => {
    const visited = new Set();
    const queue = [rootId];

    const graphNodes = {};
    const graphLinks = [];

    while (queue.length) {
      const curr = queue.shift();
      visited.add(curr);

      graphNodes[curr] = nodesMap[curr];

      links.forEach(l => {
        const src = l.source.id || l.source;
        const tgt = l.target.id || l.target;

        if (src === curr) {
          graphLinks.push({ source: src, target: tgt });

          if (!visited.has(tgt)) {
            queue.push(tgt);
          }
        }
      });
    }

    return {
      nodes: Object.values(graphNodes),
      links: graphLinks
    };
  };

  const drawGraph = (selectedRow, data) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 600;

    const g = svg.append("g");

    const nodeMap = {};
    data.nodes.forEach(n => (nodeMap[n.id] = n));

    const graph = buildGraph(selectedRow.source, data.links, nodeMap);

    const simulation = d3.forceSimulation(graph.nodes)
      .force("link", d3.forceLink(graph.links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    const link = g.selectAll("line")
      .data(graph.links)
      .enter()
      .append("line")
      .attr("stroke", "#aaa");

    const node = g.selectAll("circle")
      .data(graph.nodes)
      .enter()
      .append("circle")
      .attr("r", 10)
      .attr("fill", d => getColor(d.criticality))
      .on("click", (_, d) => highlightBlast(d.id, graph, node, link));

    const label = g.selectAll("text")
      .data(graph.nodes)
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
  };

  // 🔥 BLAST RADIUS
  const highlightBlast = (id, graph, nodeSel, linkSel) => {
    const visited = new Set();
    const queue = [id];

    while (queue.length) {
      const curr = queue.shift();
      visited.add(curr);

      graph.links.forEach(l => {
        if (l.source.id === curr && !visited.has(l.target.id)) {
          queue.push(l.target.id);
        }
      });
    }

    nodeSel.attr("opacity", d => (visited.has(d.id) ? 1 : 0.1));

    linkSel.attr("stroke", d =>
      visited.has(d.source.id) ? "red" : "#ccc"
    );
  };

  const filteredRows = rows
    .filter(r =>
      r.source.includes(search) ||
      r.target.includes(search) ||
      r.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => priority(b.criticality) - priority(a.criticality));

  function priority(c) {
    if (c === "HIGH") return 3;
    if (c === "MEDIUM") return 2;
    return 1;
  }

  const getColor = (c) => {
    if (c === "HIGH") return "red";
    if (c === "MEDIUM") return "orange";
    return "green";
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* TABLE */}
      <div style={{ width: "40%", padding: "10px", overflow: "auto" }}>
        <h3>Dependencies</h3>

        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "8px", width: "100%", marginBottom: "10px" }}
        />

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
            {filteredRows.map((r, i) => (
              <tr
                key={i}
                onClick={() => setSelected(r)}
                style={{ cursor: "pointer" }}
              >
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

      {/* GRAPH */}
      <div style={{ width: "40%", borderLeft: "1px solid #ccc" }}>
        <h3 style={{ padding: "10px" }}>Graph</h3>
        <svg ref={svgRef} width="100%" height="90%" />
      </div>

      {/* DETAILS PANEL */}
      <div style={{ width: "20%", padding: "10px", borderLeft: "1px solid #ccc" }}>
        <h3>Details</h3>

        {selected ? (
          <>
            <p><b>Source:</b> {selected.source}</p>
            <p><b>Destination:</b> {selected.target}</p>
            <p><b>Name:</b> {selected.name}</p>
            <p><b>Criticality:</b> {selected.criticality}</p>
          </>
        ) : (
          <p>Select a row</p>
        )}
      </div>

    </div>
  );
  }
