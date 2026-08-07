'use client';
import React, { useEffect, useState, useRef } from 'react';
import { featureRegistry } from '@/lib/features/registry';
import { FeatureDefinition } from '@/lib/features/types';

export default function GraphDashboardPage() {
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // In a real app this might be an API call to get the latest registry state, 
    // but here we can just use the local registry for admin view.
    setFeatures(Array.from(featureRegistry.values()));
  }, []);

  // Simple layout logic for SVG nodes
  const nodes = features.map((f, i) => {
    return {
      ...f,
      x: 100 + (i % 4) * 250,
      y: 100 + Math.floor(i / 4) * 150
    };
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full font-sans h-[calc(100vh-100px)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feature Dependency Graph</h1>
          <p className="text-sm text-slate-500 mt-1">Visualize dependencies and detect cycles without external heavy libraries.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] overflow-hidden relative">
        <svg ref={svgRef} className="w-full h-full" style={{ minHeight: '600px' }}>
          {/* Draw edges first so they are behind nodes */}
          {nodes.map((node) => {
            if (!node.dependsOn || node.dependsOn.length === 0) return null;
            return node.dependsOn.map(depKey => {
              const targetNode = nodes.find(n => n.key === depKey);
              if (!targetNode) return null;
              
              // Draw line from node to targetNode
              return (
                <line 
                  key={`${node.key}-${depKey}`}
                  x1={node.x + 100} y1={node.y + 40}
                  x2={targetNode.x + 100} y2={targetNode.y + 40}
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                />
              );
            });
          })}
          
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
            </marker>
          </defs>

          {/* Draw nodes */}
          {nodes.map(node => (
            <g key={node.key} transform={`translate(${node.x}, ${node.y})`} className="cursor-pointer hover:opacity-90 transition-opacity">
              <rect width="200" height="80" rx="16" fill={node.state === 'DEPRECATED' ? '#f1f5f9' : '#fdf4ff'} stroke={node.state === 'DEPRECATED' ? '#cbd5e1' : '#e879f9'} strokeWidth="2" />
              <text x="16" y="30" className="text-sm font-bold" fill="#0f172a">{node.name}</text>
              <text x="16" y="50" className="text-xs" fill="#64748b">{node.key}</text>
              <text x="16" y="68" className="text-[10px] uppercase font-bold" fill={node.state === 'DEPRECATED' ? '#94a3b8' : '#c026d3'}>{node.state}</text>
            </g>
          ))}
        </svg>

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h4 className="font-bold text-sm mb-2 text-slate-800">Legend</h4>
          <div className="flex gap-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-400"></div><span className="text-xs text-slate-600">Active</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300"></div><span className="text-xs text-slate-600">Deprecated</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-400"></div><span className="text-xs text-slate-600">Missing Dependency</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-400"></div><span className="text-xs text-slate-600">Cycle Detected</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
