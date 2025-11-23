/**
 * Graph Controls Component
 * Filter controls for the graph visualization
 */

interface GraphControlsProps {
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  minRelevance: number;
  setMinRelevance: (relevance: number) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  onRefresh: () => void;
  totalVibes: number;
}

const regions = [
  'Global',
  'US-West',
  'US-East',
  'US-Central',
  'EU-UK',
  'EU-Central',
  'Asia-Pacific',
];

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'trend', label: 'Trends' },
  { value: 'topic', label: 'Topics' },
  { value: 'aesthetic', label: 'Aesthetics' },
  { value: 'sentiment', label: 'Sentiments' },
  { value: 'event', label: 'Events' },
  { value: 'movement', label: 'Movements' },
  { value: 'meme', label: 'Memes' },
];

export default function GraphControls({
  selectedRegion,
  setSelectedRegion,
  minRelevance,
  setMinRelevance,
  selectedCategory,
  setSelectedCategory,
  onRefresh,
  totalVibes,
}: GraphControlsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex flex-wrap gap-6 items-end">
        {/* Region Filter */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="region-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Region
          </label>
          <select
            id="region-filter"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            aria-label="Filter vibes by region"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter vibes by category"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Relevance Slider */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="relevance-slider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Min Relevance: {(minRelevance * 100).toFixed(0)}%
          </label>
          <input
            id="relevance-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={minRelevance}
            onChange={(e) => setMinRelevance(parseFloat(e.target.value))}
            aria-label={`Minimum relevance: ${(minRelevance * 100).toFixed(0)}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(minRelevance * 100)}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Refresh Button */}
        <div>
          <button
            onClick={onRefresh}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <strong>{totalVibes}</strong> vibes
        </div>
      </div>
    </div>
  );
}
