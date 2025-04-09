// src/QueryProfiler.jsx
import { Link } from 'react-router-dom';
import QueryInput from './QueryInput';

const QueryProfiler = () => (
  <div className="p-6 text-white bg-gray-900 min-h-screen">
    <h1 className="text-2xl font-bold mb-4">QueryProfiler Page</h1>
    <QueryInput />
    <div className="mt-6">
      <Link to="/" className="text-blue-400 hover:underline">Back to Home</Link>
    </div>
  </div>
);

export default QueryProfiler;
