import { useState } from 'react'; 
import { usePGlite } from '@electric-sql/pglite-react'; 
import { analyzeSubqueries } from './QueryLogic'; 
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';  

const parseExecutionTime = (explain) => {   
  const line = explain.find(row => Object.values(row)[0].includes('Execution Time'));   
  if (line) {     
    const match = Object.values(line)[0].match(/Execution Time: ([0-9.]+) ms/);     
    return match ? parseFloat(match[1]) : 0;   
  }   
  return 0; 
};  

const QueryInput = () => {   
  const db = usePGlite();   
  const [query, setQuery] = useState("");   
  const [explainResults, setExplainResults] = useState([]);   
  const [error, setError] = useState(null);   
  const [onlyBottlenecks, setOnlyBottlenecks] = useState(false);   
  const [expanded, setExpanded] = useState({});    

  const toggleExpanded = (name) => {     
    setExpanded((prev) => ({       
      ...prev,       
      [name]: !prev[name],     
    }));   
  };    

  const handleAnalyze = async () => {     
    setError(null);     
    setExplainResults([]);     
    if (!query.trim()) {       
      setError("Please enter a query");       
      return;     
    }     
    if (!db) {       
      setError("Database not initialized");       
      return;     
    }      

    try {       
      const { results } = await analyzeSubqueries(db, query);       
      setExplainResults(results);     
    } catch (err) {       
      setError(err.message || 'Failed to analyze query');     
    }   
  };    

  const chartData = explainResults     
    .filter(r => !r.error && (!onlyBottlenecks || r.isBottleneck))     
    .map(r => ({       
      name: r.name,       
      time: parseExecutionTime(r.explain),     
    }))     
    .sort((a, b) => b.time - a.time);    

  const filteredResults = explainResults     
    .filter(r => !r.error && (!onlyBottlenecks || r.isBottleneck))     
    .sort((a, b) => b.actualTime - a.actualTime);    

  return (     
    <div className="p-6 text-white bg-gray-900 min-h-screen flex flex-col md:flex-row gap-6">       

      {/* Query Input and Control Area */}
      <div className="flex flex-col w-full md:w-1/3">       
        <textarea         
          value={query}         
          onChange={(e) => setQuery(e.target.value)}         
          rows={5}         
          className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white font-mono"         
          placeholder="Enter SQL query..."       
        />        

        <div className="mt-4 flex gap-4 items-center">         
          <button           
            onClick={handleAnalyze}           
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"           
            disabled={!db}         
          >           
            Analyze Subqueries         
          </button>          

          <label className="flex items-center gap-2 text-sm">           
            <input             
              type="checkbox"             
              checked={onlyBottlenecks}             
              onChange={() => setOnlyBottlenecks(!onlyBottlenecks)}             
              className="accent-blue-500"           
            />           
            Show only bottlenecks         
          </label>       
        </div>       

        {error && <p className="text-red-500 mt-2">{error}</p>}       
        {explainResults.length === 0 && !error }      
      </div>       

      {/* Right Section: Chart and Results */}
      <div className="flex flex-col w-full md:w-2/3">        

        {/* Execution Time Chart - horizontal layout */}
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

        {/* Scrollable Results */}
        <div className="overflow-y-auto max-h-[60vh]">          
          {filteredResults.length > 0 ? (         
            filteredResults.map((result, index) => (           
              <div             
                key={index}             
                className={`bg-gray-800 text-gray-100 p-4 rounded-lg shadow-md mb-4 transition-all ${               
                  result.isBottleneck ? 'border border-red-500' : ''             
                }`}           
              >             
                <div className="flex justify-between items-center">               
                  <h4 className="text-yellow-300 font-bold text-lg">                 
                    {result.name}               
                  </h4>               
                  <button                 
                    onClick={() => toggleExpanded(result.name)}                 
                    className="text-sm text-blue-400 hover:underline"               
                  >                 
                    {expanded[result.name] ? 'Collapse' : 'Expand'}               
                  </button>             
                </div>              

                {expanded[result.name] && (               
                  <>                 
                    <code className="block text-blue-300 mb-4 whitespace-pre-wrap">{result.sql}</code>                 
                    <div className="text-sm text-gray-400 mb-2">                   
                      <p>Execution Time: {result.actualTime.toFixed(3)} ms</p>                   
                      <p>Rows: {result.rows}</p>                 
                    </div>                 
                    <pre className="text-sm font-mono text-gray-200 whitespace-pre-wrap">                   
                      {result.explain.map((row) => Object.values(row)[0]).join('\n')}                 
                    </pre>                 
                    {result.suggestions?.length > 0 && (                   
                      <div className="mt-2 text-sm text-green-400">                     
                        <h5 className="font-semibold mb-1">Suggestions:</h5>                     
                        <ul className="list-disc list-inside">                       
                          {result.suggestions.map((s, idx) => (                         
                            <li key={idx}>{s}</li>                       
                          ))}                     
                        </ul>                   
                      </div>                 
                    )}               
                  </>             
                )}           
              </div>         
            ))       
          ) : (         
            <p className="text-gray-400">No analysis results available.</p>       
          )}       
        </div>     
      </div>  
    </div>   
  ); 
};  

export default QueryInput;
