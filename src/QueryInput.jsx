import { useState } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';
import { analyzeSubqueries } from './QueryLogic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';

const parseExecutionTime = (explain) => {
  const line = explain.find(row => Object.values(row)[0].includes('Execution Time'));
  if (line) {
    const match = Object.values(line)[0].match(/Execution Time: ([0-9.]+) ms/);
    if (match) return parseFloat(match[1]);
  }
  return 0;
};

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

  const chartData = explainResults
    .filter(r => !r.error)
    .map(r => ({
      name: r.name,
      time: parseExecutionTime(r.explain),
    }));

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

      {chartData.length > 0 && (
        <div className="my-10">
          <h3 className="text-xl font-bold mb-4">Execution Time Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: '#ccc' }} />
              <Tooltip formatter={(value) => `${value} ms`} />
              <Bar dataKey="time" fill="#60a5fa">
                <LabelList dataKey="time" position="top" formatter={(val) => `${val} ms`} fill="#fff" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <h3 className="text-xl font-bold mt-8 mb-4">Detailed Subquery Analysis</h3>

      {explainResults.map((result, index) => (
        <div key={index} className="bg-gray-800 text-gray-100 p-4 rounded-lg shadow-md mb-6">
          <h4 className="text-yellow-300 font-bold text-lg mb-2">{result.name}</h4>
          <code className="block text-blue-300 mb-4 whitespace-pre-wrap">{result.sql}</code>
          {result.error ? (
            <p className="text-red-400">Error: {result.error}</p>
          ) : (
            <pre className="text-sm font-mono text-gray-200 whitespace-pre-wrap">
              {result.explain.map((row) => Object.values(row)[0]).join('\n')}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

export default QueryInput;