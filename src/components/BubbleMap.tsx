import { useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";
import type { Cluster } from "@/lib/reasona";

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
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    const svg = d3.select(ref.current);
    if (clusters.length === 0) {
      svg.selectAll("*").remove();
      return;
    }

    svg.selectAll("*").remove();

    const area = width * height;
    const scale = Math.sqrt(area / 380000);
    const nodes: Node[] = [];

    clusters.forEach((cluster) => {
      nodes.push({
        id: `${cluster.id}-main`,
        r: Math.max(50, Math.min(130, (28 + Math.sqrt(cluster.members) * 8) * scale)),
        color: sideColor[cluster.side],
        side: cluster.side,
        label: cluster.label,
        members: cluster.members,
        cluster,
      });

      const satellites = Math.min(8, Math.max(3, Math.floor(cluster.members / 10)));
      for (let i = 0; i < satellites; i++) {
        nodes.push({
          id: `${cluster.id}-s${i}`,
          r: Math.max(2, (6 + Math.random() * 10) * scale),
          color: sideColor[cluster.side],
          side: cluster.side,
          label: cluster.label,
          members: cluster.members,
          cluster,
        });
      }
    });

    for (let i = 0; i < 20; i++) {
      const side = (["for", "against", "neutral"] as const)[i % 3];
      nodes.push({
        id: `orphan-${i}`,
        r: Math.max(2, (3 + Math.random() * 4) * scale),
        color: sideColor[side],
        side,
        label: "Outlier opinion",
        members: 1,
        cluster: clusters[0],
      });
    }

    const defs = svg.append("defs");
    nodes.forEach((node, index) => {
      const gradient = defs
        .append("radialGradient")
        .attr("id", `bg-${uid}-${index}`)
        .attr("cx", "30%")
        .attr("cy", "30%");

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d3.color(node.color)?.brighter(1.2)?.toString() ?? node.color)
        .attr("stop-opacity", 0.95);

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", node.color)
        .attr("stop-opacity", 0.4);
    });

    const graph = svg.append("g");

    const linkData: { source: string; target: string }[] = [];
    clusters.forEach((cluster) => {
      const main = `${cluster.id}-main`;
      nodes
        .filter((node) => node.id.startsWith(`${cluster.id}-s`))
        .forEach((node) => {
          linkData.push({ source: main, target: node.id });
        });
    });

    const link = graph
      .append("g")
      .attr("stroke", "#a855f7")
      .attr("stroke-opacity", 0.15)
      .selectAll("line")
      .data(linkData)
      .enter()
      .append("line")
      .attr("stroke-width", 0.8);

    const node = graph
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (datum) => datum.r)
      .attr("fill", (_, index) => `url(#bg-${uid}-${index})`)
      .attr("stroke", (datum) => datum.color)
      .attr("stroke-opacity", 0.5)
      .style("cursor", (datum) => (datum.id.endsWith("-main") ? "pointer" : "default"))
      .style("filter", (datum) =>
        datum.id.endsWith("-main") ? `drop-shadow(0 0 10px ${datum.color})` : "none",
      )
      .on("mouseenter", (_, datum) => datum.id.endsWith("-main") && setHovered(datum.cluster))
      .on("mouseleave", () => setHovered(null))
      .on("click", (_, datum) => datum.id.endsWith("-main") && setSelected(datum.cluster));

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force("charge", d3.forceManyBody().strength(-8))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide<Node>().radius((datum) => datum.r + 2),
      )
      .force("x", d3.forceX(width / 2).strength(0.12))
      .force("y", d3.forceY(height / 2).strength(0.12))
      .force(
        "link",
        d3
          .forceLink(linkData)
          .id((datum: d3.SimulationNodeDatum) => (datum as Node).id)
          .distance(30)
          .strength(0.4),
      )
      .on("tick", () => {
        node.attr("cx", (datum) => datum.x ?? 0).attr("cy", (datum) => datum.y ?? 0);
        link
          .attr("x1", (datum) => (datum.source as unknown as Node).x ?? 0)
          .attr("y1", (datum) => (datum.source as unknown as Node).y ?? 0)
          .attr("x2", (datum) => (datum.target as unknown as Node).x ?? 0)
          .attr("y2", (datum) => (datum.target as unknown as Node).y ?? 0);
      });

    let pulse = 0;
    const pulseTimer = d3.interval(() => {
      pulse += 0.05;
      node.attr("r", (datum) => Math.max(2, datum.r + Math.sin(pulse + datum.r) * 0.6));
    }, 50);

    return () => {
      simulation.stop();
      pulseTimer.stop();
    };
  }, [clusters, width, height, uid]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={ref}
        width={width}
        height={height}
        style={{
          background: "transparent",
          borderRadius: 16,
        }}
      />
      {hovered && (
        <div className="absolute top-3 left-3 glass rounded-lg px-3 py-2 text-xs max-w-xs pointer-events-none">
          <div className="font-semibold mb-1" style={{ color: sideColor[hovered.side] }}>
            {hovered.members} voters | {hovered.side.toUpperCase()}
          </div>
          <div className="text-muted-foreground">{hovered.label}</div>
        </div>
      )}
      {selected && (
        <div
          className="absolute inset-3 glass rounded-xl p-4 overflow-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                className="text-[10px] uppercase tracking-widest"
                style={{ color: sideColor[selected.side] }}
              >
                Cluster {selected.id} | {selected.members} members
              </div>
              <div className="font-semibold">{selected.label}</div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              x
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border border-white/5 rounded-md p-3 bg-white/[0.02]">
              <div className="text-muted-foreground mb-1">Members</div>
              <div className="text-lg font-semibold">{selected.members}</div>
            </div>
            <div className="border border-white/5 rounded-md p-3 bg-white/[0.02]">
              <div className="text-muted-foreground mb-1">Confidence</div>
              <div className="text-lg font-semibold">{selected.confidence ?? 0}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
