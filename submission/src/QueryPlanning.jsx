import ExplainQuery from './ExplainQuery';
import ScanOptions from './ScanOptions';
import JoinOptions from './JoinOptions';
import SortOptions from './SortOptions';
import GroupOptions from './GroupOptions';

import { useState } from 'react';

function QueryPlanning({ studentSchema }) {
  const [queryHistory, setQueryHistory] = useState([]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log(`Copied: ${text}`);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh' }}>
      {/* Main content area */}
      <div style={{ flex: 1, padding: '1rem', paddingLeft: '3rem', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Query Plan Analysis</h2>
        <>
          <ExplainQuery
            studentSchema={studentSchema}
            queryHistory={queryHistory}
            setQueryHistory={setQueryHistory}
          />
          <ScanOptions />
          <JoinOptions />
          <SortOptions />
          <GroupOptions />
        </>
      </div>

      {/* Query History side panel */}
      <div style={{
        width: '20%',
        padding: '1rem',
        borderLeft: '1px solid #ccc',
        overflowY: 'auto'
      }}>
        <h4 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Query History:</h4>
        <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
          {queryHistory.map((query, index) => {
            return (
              <li
                key={index}
                onClick={() => copyToClipboard(query)}
                title="Click to copy"
                style={{
                  backgroundColor: '#1a1d21',
                  fontSize: '1rem',
                  marginBottom: '2px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  userSelect: 'none',
                  lineHeight: '1.8rem',
                  padding: '0.5rem',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#a8d8ff';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#1a1d21';
                  e.currentTarget.style.color = '#fff';
                }}
              >
                {query}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default QueryPlanning;
