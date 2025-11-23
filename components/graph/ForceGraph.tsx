'use client';

/**
 * Force-Directed Graph Component
 * D3.js-based visualization of the cultural graph
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  name: string;
  category: string;
  strength: number;
  currentRelevance: number;
  sentiment: string;
  region: string;
  keywords: string[];
  description: string;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  strength: number;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface ForceGraphProps {
  data: GraphData;
  width: number;
  height: number;
}

const categoryColors: Record<string, string> = {
  trend: '#3b82f6',      // blue
  topic: '#10b981',      // green
  aesthetic: '#8b5cf6',  // purple
  sentiment: '#f59e0b',  // amber
  event: '#ef4444',      // red
  movement: '#ec4899',   // pink
  meme: '#14b8a6',       // teal
  custom: '#6b7280',     // gray
};

export default function ForceGraph({ data, width, height }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.nodes.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);

    // Create simulation
    const simulation = d3.forceSimulation(data.nodes as any[])
      .force('link', d3.forceLink(data.edges as any[])
        .id((d: any) => d.id)
        .distance(100)
        .strength((d: any) => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', (d: any) => d.strength * 2);

    // Create nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', (d: any) => 5 + d.currentRelevance * 20)
      .attr('fill', (d: any) => categoryColors[d.category] || categoryColors.custom)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on('click', (event, d: any) => {
        setSelectedNode(d);
      })
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 5 + d.currentRelevance * 25)
          .attr('stroke-width', 3);
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 5 + d.currentRelevance * 20)
          .attr('stroke-width', 2);
      });

    // Add labels
    const label = svg.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => -(5 + d.currentRelevance * 20) - 5)
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .attr('pointer-events', 'none')
      .text((d: any) => d.name)
      .style('opacity', 0.7);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    // Cleanup
    return () => {
      simulation.stop();
      // Remove all event listeners to prevent memory leaks
      svg.selectAll('*').on('.drag', null);
      svg.selectAll('*').on('click', null);
      svg.selectAll('*').on('mouseover', null);
      svg.selectAll('*').on('mouseout', null);
      svg.selectAll('*').remove();
    };
  }, [data, width, height]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Cultural graph visualization showing ${data.nodes.length} vibes and their connections`}
        className="bg-gray-50 dark:bg-gray-900 rounded-lg"
      >
        <title>Cultural Graph Visualization</title>
        <desc>
          Interactive force-directed graph with {data.nodes.length} nodes representing cultural vibes,
          connected by {data.edges.length} edges showing relationships. Click nodes for details.
        </desc>
      </svg>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {selectedNode.name}
            </h3>

            <div className="flex gap-2 flex-wrap">
              <span
                className="inline-block px-2 py-1 text-xs rounded text-white"
                style={{ backgroundColor: categoryColors[selectedNode.category] }}
              >
                {selectedNode.category}
              </span>
              <span className="inline-block px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {selectedNode.region}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedNode.description}
            </p>

            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Strength:</span>{' '}
                <span className="font-medium">{(selectedNode.strength * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Relevance:</span>{' '}
                <span className="font-medium">{(selectedNode.currentRelevance * 100).toFixed(0)}%</span>
              </div>
            </div>

            {selectedNode.keywords.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Keywords:</span>
                <div className="flex gap-1 flex-wrap mt-1">
                  {selectedNode.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow p-3">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Categories</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(categoryColors).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
