import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { Cluster } from "@/mock/proposals";

const sideColor = {
  for: "#a855f7",
  against: "#6b21a8",
  neutral: "#4b5563",
} as const;

interface Node extends d3.SimulationNodeDatum {
  id: string;
  r: number;
  color: string;
  side: keyof typeof sideColor;
  label: string;
  members: number;
  cluster: Cluster;
}

export function BubbleMap({ clusters, height = 480 }: { clusters: Cluster[]; height?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<Cluster | null>(null);
  const [selected, setSelected] = useState<Cluster | null>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    // Build nodes: one big bubble per cluster + smaller satellites per entry
    const nodes: Node[] = [];
    clusters.forEach((c) => {
      const main: Node = {
        id: `${c.id}-main`,
        r: Math.max(28, Math.min(70, 18 + Math.sqrt(c.members) * 6)),
        color: sideColor[c.side],
        side: c.side,
        label: c.label,
        members: c.members,
        cluster: c,
      };
      nodes.push(main);
      const satellites = Math.min(6, Math.max(2, Math.floor(c.members / 12)));
      for (let i = 0; i < satellites; i++) {
        nodes.push({
          id: `${c.id}-s${i}`,
          r: 4 + Math.random() * 6,
          color: sideColor[c.side],
          side: c.side,
          label: c.label,
          members: c.members,
          cluster: c,
        });
      }
    });
    // orphans
    for (let i = 0; i < 18; i++) {
      const side = (["for", "against", "neutral"] as const)[i % 3];
      nodes.push({
        id: `orphan-${i}`,
        r: 2 + Math.random() * 3,
        color: sideColor[side],
        side,
        label: "Outlier opinion",
        members: 1,
        cluster: clusters[0],
      });
    }

    const w = width;
    const h = height;

    const defs = svg.append("defs");
    nodes.forEach((n, i) => {
      const g = defs.append("radialGradient").attr("id", `bg-${i}`).attr("cx", "30%").attr("cy", "30%");
      g.append("stop").attr("offset", "0%").attr("stop-color", d3.color(n.color)?.brighter(1.2)?.toString() ?? n.color).attr("stop-opacity", 0.95);
      g.append("stop").attr("offset", "100%").attr("stop-color", n.color).attr("stop-opacity", 0.4);
    });

    const g = svg.append("g");

    const linkData: { source: string; target: string }[] = [];
    clusters.forEach((c) => {
      const main = `${c.id}-main`;
      nodes.filter((n) => n.id.startsWith(`${c.id}-s`)).forEach((n) => {
        linkData.push({ source: main, target: n.id });
      });
    });

    const link = g.append("g").attr("stroke", "#a855f7").attr("stroke-opacity", 0.15)
      .selectAll("line").data(linkData).enter().append("line").attr("stroke-width", 0.8);

    const node = g.append("g").selectAll("circle").data(nodes).enter().append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (_, i) => `url(#bg-${i})`)
      .attr("stroke", (d) => d.color)
      .attr("stroke-opacity", 0.5)
      .style("cursor", (d) => (d.id.endsWith("-main") ? "pointer" : "default"))
      .style("filter", (d) => (d.id.endsWith("-main") ? `drop-shadow(0 0 10px ${d.color})` : "none"))
      .on("mouseenter", (_, d) => d.id.endsWith("-main") && setHovered(d.cluster))
      .on("mouseleave", () => setHovered(null))
      .on("click", (_, d) => d.id.endsWith("-main") && setSelected(d.cluster));

    const sim = d3
      .forceSimulation<Node>(nodes)
      .force("charge", d3.forceManyBody().strength(-12))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collide", d3.forceCollide<Node>().radius((d) => d.r + 3))
      .force("x", d3.forceX(w / 2).strength(0.04))
      .force("y", d3.forceY(h / 2).strength(0.04))
      .force(
        "link",
        d3
          .forceLink(linkData)
          .id((d: d3.SimulationNodeDatum) => (d as Node).id)
          .distance(50)
          .strength(0.2)
      )
      .on("tick", () => {
        node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
        link
          .attr("x1", (d) => (d.source as unknown as Node).x ?? 0)
          .attr("y1", (d) => (d.source as unknown as Node).y ?? 0)
          .attr("x2", (d) => (d.target as unknown as Node).x ?? 0)
          .attr("y2", (d) => (d.target as unknown as Node).y ?? 0);
      });

    // gentle pulse
    let pulse = 0;
    const pulseTimer = d3.interval(() => {
      pulse += 0.05;
      node.attr("r", (d) => d.r + Math.sin(pulse + d.r) * 0.6);
    }, 50);

    return () => {
      sim.stop();
      pulseTimer.stop();
    };
  }, [clusters, width, height]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={ref}
        width={width}
        height={height}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(168,85,247,0.08), transparent 70%), #080810",
          borderRadius: 16,
        }}
      />
      {hovered && (
        <div className="absolute top-3 left-3 glass rounded-lg px-3 py-2 text-xs max-w-xs pointer-events-none">
          <div className="font-semibold mb-1" style={{ color: sideColor[hovered.side] }}>
            {hovered.members} voters · {hovered.side.toUpperCase()}
          </div>
          <div className="text-muted-foreground">{hovered.label}</div>
        </div>
      )}
      {selected && (
        <div className="absolute inset-3 glass rounded-xl p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: sideColor[selected.side] }}>
                Cluster {selected.id} · {selected.members} members
              </div>
              <div className="font-semibold">{selected.label}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <ul className="space-y-2 text-xs">
            {selected.entries.slice(0, 12).map((e, i) => (
              <li key={i} className="border border-white/5 rounded-md p-2 bg-white/[0.02]">
                <div className="font-mono text-violet-300 mb-1">{e.address.slice(0, 8)}...{e.address.slice(-4)}</div>
                <div className="text-muted-foreground">{e.reasoning}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
