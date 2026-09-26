import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, Zap, Info, ShieldAlert } from 'lucide-react';

export default function ConceptGraphView({ graphNodes, graphEdges, rootBottleneck, onSelectConcept }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // Position nodes along a responsive 4-tier DAG layout
  const tierX = {
    1: 80,
    2: 270,
    3: 470,
    4: 670,
  };

  // Group nodes by tier to compute vertical Y coordinates
  const tierGroups = { 1: [], 2: [], 3: [], 4: [] };
  graphNodes.forEach((node) => {
    const t = node.tier || 1;
    if (tierGroups[t]) tierGroups[t].push(node);
  });

  const nodePositions = {};
  const height = 185;

  Object.entries(tierGroups).forEach(([tier, nodesInTier]) => {
    const count = nodesInTier.length;
    const spacing = height / (count + 1);
    nodesInTier.forEach((node, idx) => {
      nodePositions[node.id] = {
        x: tierX[tier] || 100,
        y: 20 + spacing * (idx + 1),
      };
    });
  });

  const getNodeColor = (node) => {
    if (rootBottleneck && node.id === rootBottleneck.concept_id) {
      return { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24' };
    }
    if (node.mastery_score >= 0.70) {
      return { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.2)', text: '#34D399' };
    }
    if (node.status === 'ready_to_learn') {
      return { stroke: '#6366F1', fill: 'rgba(99, 102, 241, 0.2)', text: '#818CF8' };
    }
    return { stroke: '#EF4444', fill: 'rgba(239, 68, 68, 0.15)', text: '#F87171' };
  };

  const activeNode = selectedNode || hoveredNode;

  return (
    <div className="glass-panel" style={{ padding: '0.75rem 1rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Zap size={15} color="#6366F1" />
            Curriculum Prerequisite Knowledge DAG
          </h3>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
            <span>Mastered (≥70%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
            <span>Root Bottleneck</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
            <span>Blocked Gap</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', overflow: 'hidden' }}>
        <svg viewBox="0 0 760 215" style={{ width: '100%', height: '215px', display: 'block' }}>
          <defs>
            <marker id="arrow-default" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="rgba(255, 255, 255, 0.25)" />
            </marker>
            <marker id="arrow-blocking" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#F59E0B" />
            </marker>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Tier labels in background */}
          <text x="80" y="14" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="0.04em">TIER 1 (SYNTAX)</text>
          <text x="270" y="14" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="0.04em">TIER 2 (DATA)</text>
          <text x="470" y="14" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="0.04em">TIER 3 (THEORY & RECURSION)</text>
          <text x="670" y="14" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="0.04em">TIER 4 (ALGORITHMS)</text>

          {/* Directed Edges */}
          {graphEdges.map((edge, idx) => {
            const src = nodePositions[edge.source];
            const dst = nodePositions[edge.target];
            if (!src || !dst) return null;

            const isBlocking = edge.is_blocking;
            const strokeColor = isBlocking ? '#F59E0B' : 'rgba(255, 255, 255, 0.2)';
            const marker = isBlocking ? 'url(#arrow-blocking)' : 'url(#arrow-default)';

            // Cubic Bezier curve for clean graph routing
            const dx = dst.x - src.x;
            const pathD = `M ${src.x} ${src.y} C ${src.x + dx * 0.5} ${src.y}, ${dst.x - dx * 0.5} ${dst.y}, ${dst.x} ${dst.y}`;

            return (
              <g key={`edge-${idx}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isBlocking ? 2.2 : 1.4}
                  strokeDasharray={isBlocking ? '4 3' : 'none'}
                  markerEnd={marker}
                  opacity={isBlocking ? 0.9 : 0.4}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {graphNodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;

            const isRoot = rootBottleneck && node.id === rootBottleneck.concept_id;
            const style = getNodeColor(node);
            const isHovered = hoveredNode && hoveredNode.id === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  setSelectedNode(node);
                  if (onSelectConcept) onSelectConcept(node.id);
                }}
              >
                {/* Glow ring for root bottleneck */}
                {isRoot && (
                  <circle
                    r="24"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="3"
                    strokeDasharray="3 3"
                    opacity="0.8"
                    filter="url(#glow)"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                <circle
                  r={isHovered ? 18 : 15}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Concept ID */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  fill={style.text}
                >
                  {node.id}
                </text>

                {/* Node Name Label */}
                <text
                  textAnchor="middle"
                  dy={isHovered ? 30 : 26}
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#CBD5E1"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.name.length > 18 ? node.name.slice(0, 16) + '..' : node.name}
                </text>

                {/* Mastery % below */}
                <text
                  textAnchor="middle"
                  dy={isHovered ? 41 : 37}
                  fontSize="8.5"
                  fontFamily="var(--font-mono)"
                  fill={style.text}
                  style={{ pointerEvents: 'none' }}
                >
                  {Math.round(node.mastery_score * 100)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Concept Quick Detail Drawer */}
      {activeNode && (
        <div
          style={{
            marginTop: '0.4rem',
            padding: '0.4rem 0.8rem',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontWeight: '700',
                fontSize: '0.75rem',
                color: '#818CF8',
              }}
            >
              {activeNode.id}
            </div>
            <div>
              <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{activeNode.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                Tier {activeNode.tier} • Mastery: {Math.round(activeNode.mastery_score * 100)}%
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeNode.mastery_score >= 0.70 ? (
              <span className="badge badge-mastered" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                <CheckCircle size={11} /> Mastered
              </span>
            ) : rootBottleneck && activeNode.id === rootBottleneck.concept_id ? (
              <span className="badge badge-bottleneck pulse-bottleneck" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                <ShieldAlert size={11} /> Root Bottleneck
              </span>
            ) : (
              <span className="badge badge-gap" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                <AlertTriangle size={11} /> Blocked Gap
              </span>
            )}

            {onSelectConcept && (
              <button
                className="btn-secondary"
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                onClick={() => onSelectConcept(activeNode.id)}
              >
                Target <ArrowRight size={11} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
