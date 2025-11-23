'use client';

/**
 * Graph Visualization Page
 * Interactive D3-based visualization of the cultural graph
 */

import { useState, useEffect, useCallback } from 'react';
import ForceGraph from '@/components/graph/ForceGraph';
import GraphControls from '@/components/graph/GraphControls';

interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    category: string;
    strength: number;
    currentRelevance: number;
    sentiment: string;
    region: string;
    keywords: string[];
    description: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    strength: number;
  }>;
  metadata: {
    totalVibes: number;
    filters: {
      region?: string;
      minRelevance?: number;
      category?: string;
    };
  };
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('Global');
  const [minRelevance, setMinRelevance] = useState<number>(0.1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedRegion !== 'Global') params.append('region', selectedRegion);
      params.append('minRelevance', minRelevance.toString());
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`/api/graph?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch graph data');
      }

      const data: GraphData = await response.json();
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching graph data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRegion, minRelevance, selectedCategory]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Cultural Graph Visualization
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore the living cultural graph - trends, vibes, and zeitgeist moments
          </p>
        </header>

        <GraphControls
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          minRelevance={minRelevance}
          setMinRelevance={setMinRelevance}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onRefresh={fetchGraphData}
          totalVibes={graphData?.metadata.totalVibes || 0}
        />

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 dark:text-gray-400">Loading graph...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-96">
              <div className="text-red-500">Error: {error}</div>
            </div>
          )}

          {!loading && !error && graphData && (
            <ForceGraph
              data={graphData}
              width={1200}
              height={800}
            />
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 space-y-2">
          <p>
            <strong>Node size:</strong> Current relevance (temporal decay applied)
          </p>
          <p>
            <strong>Node color:</strong> Category (trend, topic, aesthetic, etc.)
          </p>
          <p>
            <strong>Edges:</strong> Connections based on category, keywords, or region
          </p>
          <p>
            <strong>Interaction:</strong> Drag nodes to explore, hover for details
          </p>
        </div>
      </div>
    </div>
  );
}
