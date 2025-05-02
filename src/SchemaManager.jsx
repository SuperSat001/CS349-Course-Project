// src/SchemaManager.jsx
import React from 'react';

const SchemaManager = ({ availableSchemas, activeSchema, onSelectSchema, onDeleteSchema }) => {

    if (!availableSchemas || availableSchemas.length === 0) {
        return (
            <div className="container mx-auto my-2 p-2 text-sm text-center text-gray-400">
                No student database schemas loaded yet. Use "Load Student DB".
            </div>
        );
    }

    const handleSelectChange = (e) => {
        onSelectSchema(e.target.value || null); // Pass null if default option selected
    };

    return (
        <div className="container mx-auto my-2 p-3 bg-gray-900 border border-gray-700 rounded shadow-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                 <label htmlFor="schema-select" className="text-sm font-medium text-gray-300 whitespace-nowrap">
                     Active Student Schema:
                 </label>
                 <select
                     id="schema-select"
                     value={activeSchema || ''} // Handle null value for default option
                     onChange={handleSelectChange}
                     className="input input-sm text-xs appearance-none" // Use input styling, smaller
                     style={{maxWidth: '250px'}} // Limit width
                 >
                     <option value="">-- Select / None --</option>
                     {availableSchemas.map(schema => (
                         <option key={schema} value={schema}>
                             {schema}
                         </option>
                     ))}
                 </select>
            </div>
            {/* Optional: Display list with delete buttons - maybe better on a dedicated page */}
            {activeSchema && (
                 <button
                     onClick={() => onDeleteSchema(activeSchema)}
                     className="button-error text-xs p-1" // Smaller padding
                     title={`Delete schema ${activeSchema}`}
                 >
                     Delete Active Schema
                 </button>
            )}

        </div>
    );
};

export default SchemaManager;