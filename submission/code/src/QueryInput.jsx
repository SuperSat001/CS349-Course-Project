// src/QueryInput.jsx
import { useState } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';
import { analyzeSubqueries } from './QueryLogic';

const QueryInput = () => {
  const db = usePGlite();
  const [query, setQuery] = useState("");
  const [explainResults, setExplainResults] = useState([]);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setError(null);
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    try {
      const { results } = await analyzeSubqueries(db, query);
      setExplainResults(results);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={5}
        className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white font-mono"
        placeholder="Enter SQL query..."
      />
      <button
        onClick={handleAnalyze}
        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
      >
        Analyze Subqueries
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      <h3 className="text-xl font-bold mt-8 mb-4">Subquery Analysis</h3>

      {explainResults.map((result, index) => (
        <div key={index} className="bg-gray-800 text-gray-100 p-4 rounded-lg shadow-md mb-6">
          <h4 className="text-yellow-300 font-bold text-lg mb-2">{result.name}</h4>
          <code className="block text-blue-300 mb-4">{result.sql}</code>
          {result.error ? (
            <p className="text-red-400">Error: {result.error}</p>
          ) : (
            result.explain.map((row, i) => (
              <div key={i} className="text-sm font-mono text-gray-200">{Object.values(row)[0]}</div>
            ))
          )}
        </div>
      ))}
    </div>
  );
};

export default QueryInput;
