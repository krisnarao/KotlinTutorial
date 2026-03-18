import React, { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("http://localhost:8080/api/graph")
      .then(res => res.json())
      .then(res => {
        const rows = transform(res);
        setData(rows);
      });
  }, []);

  const transform = ({ nodes, links }) => {
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    return links.map(l => {
      const src = l.source.id || l.source;
      const tgt = l.target.id || l.target;

      return {
        source: src,
        destination: tgt,
        name: nodeMap[tgt]?.name || "",
        criticality: nodeMap[tgt]?.criticality || "UNKNOWN"
      };
    });
  };

  const filtered = data.filter(row =>
    row.source.includes(search) ||
    row.destination.includes(search) ||
    row.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dependency Table</h2>

      <input
        placeholder="Search ITAM / Service"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ padding: "8px", marginBottom: "10px", width: "300px" }}
      />

      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Source</th>
            <th>Destination</th>
            <th>Name</th>
            <th>Criticality</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((row, i) => (
            <tr key={i}>
              <td>{row.source}</td>
              <td>{row.destination}</td>
              <td>{row.name}</td>
              <td style={{ color: getColor(row.criticality) }}>
                {row.criticality}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  function getColor(c) {
    if (c === "HIGH") return "red";
    if (c === "MEDIUM") return "orange";
    return "green";
  }
}
