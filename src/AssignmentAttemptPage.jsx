// src/AssignmentAttemptPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePGlite } from '@electric-sql/pglite-react';

// Helper component for displaying query results as a table
const ResultTable = ({ rows }) => {
    if (!rows || rows.length === 0) {
        return <p className="text-sm text-gray-400 mt-2">(No results)</p>;
    }
    const headers = Object.keys(rows[0]);
    return (
        <div className="overflow-x-auto mt-2 border border-gray-600 rounded max-h-60">
            <table className="table text-xs">
                <thead className="sticky top-0 bg-gray-700">
                    <tr>
                        {headers.map((header) => <th key={header} className="th">{header}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i}>
                            {headers.map((header, j) => (
                                <td key={`${i}-${j}`} className="td">
                                    {typeof row[header] === 'boolean' ? String(row[header]) : (row[header] ?? 'NULL')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const AssignmentAttemptPage = ({ studentSchema }) => { // Expect studentSchema prop if loaded
    const { assignmentId } = useParams(); // Get assignmentId from URL
    const db = usePGlite();
    const [assignment, setAssignment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [studentQueries, setStudentQueries] = useState({}); // Store query text per question_id
    const [queryResults, setQueryResults] = useState({}); // Store query result per question_id
    const [queryErrors, setQueryErrors] = useState({}); // Store query error per question_id
    const [correctness, setCorrectness] = useState({}); // Store correctness per question_id

    // Fetch assignment and question details
    useEffect(() => {
        const fetchAssignmentData = async () => {
            if (!db || !assignmentId) return;
            setLoading(true);
            setError('');
            try {
                 // Fetch assignment details (adjust courseId if needed)
                 const courseId = 'cs387iitb_5705'; // Or get from context/URL
                 const assgnRes = await db.query(
                    'SELECT * FROM public.xdata_assignment WHERE course_id = $1 AND assignment_id = $2',
                    [courseId, assignmentId]
                 );
                 if (assgnRes.rows.length === 0) {
                     throw new Error(`Assignment with ID ${assignmentId} not found for course ${courseId}.`);
                 }
                 setAssignment(assgnRes.rows[0]);

                 // Fetch questions for this assignment
                 const qinfoRes = await db.query(
                     'SELECT * FROM public.xdata_qinfo WHERE course_id = $1 AND assignment_id = $2 ORDER BY question_id',
                     [courseId, assignmentId]
                 );
                 setQuestions(qinfoRes.rows);
                 // Initialize state objects
                 setStudentQueries(qinfoRes.rows.reduce((acc, q) => ({ ...acc, [q.question_id]: '' }), {}));
                 setQueryResults(qinfoRes.rows.reduce((acc, q) => ({ ...acc, [q.question_id]: null }), {}));
                 setQueryErrors(qinfoRes.rows.reduce((acc, q) => ({ ...acc, [q.question_id]: null }), {}));
                 setCorrectness(qinfoRes.rows.reduce((acc, q) => ({ ...acc, [q.question_id]: null }), {}));

            } catch (err) {
                console.error("Error fetching assignment data:", err);
                setError(`Failed to load assignment: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchAssignmentData();
    }, [db, assignmentId]);

    const handleQueryChange = (questionId, queryText) => {
        setStudentQueries(prev => ({ ...prev, [questionId]: queryText }));
    };

    const runStudentQuery = async (questionId) => {
        const studentQuery = studentQueries[questionId];
        if (!studentQuery || !studentQuery.trim() || !db || !studentSchema) {
            setQueryErrors(prev => ({ ...prev, [questionId]: 'Please enter a query and ensure a student DB is loaded.' }));
            setQueryResults(prev => ({ ...prev, [questionId]: null }));
            setCorrectness(prev => ({ ...prev, [questionId]: null }));
            return;
        }

        setQueryErrors(prev => ({ ...prev, [questionId]: null })); // Clear previous error
        setQueryResults(prev => ({ ...prev, [questionId]: null })); // Clear previous result
        setCorrectness(prev => ({ ...prev, [questionId]: null })); // Clear correctness
        let currentResult = null;
        let currentError = null;

        // Store original search path
        let originalSearchPath = 'public';
        try {
            const pathResult = await db.query("SHOW search_path;");
            if (pathResult?.rows?.length > 0) originalSearchPath = pathResult.rows[0].search_path;
        } catch (e) { console.warn("Could not get original search_path"); }

        try {
            // Set context to student schema
            await db.query(`SET search_path TO ${db.quoteIdent(studentSchema)}, public;`);

            currentResult = await db.query(studentQuery); // Execute student query

        } catch (err) {
            console.error(`Error running student query for Q${questionId}:`, err);
            currentError = `Error: ${err.message}`;
        } finally {
            // Always reset search path
             try { await db.query(`SET search_path TO ${originalSearchPath};`); }
             catch(e) { console.error("Failed to restore search path", e); }
        }

        setQueryResults(prev => ({ ...prev, [questionId]: currentResult?.rows || null }));
        setQueryErrors(prev => ({ ...prev, [questionId]: currentError }));

        // --- TODO: Implement Result Comparison Logic ---
        if (currentResult && !currentError) {
             compareResults(questionId, currentResult.rows);
        }
        // --- Store Attempt (xdata_student_queries) ---
        // TODO: Add logic to INSERT into xdata_student_queries
    };

     // Placeholder for comparison logic
     const compareResults = async (questionId, studentResultRows) => {
         const question = questions.find(q => q.question_id === questionId);
         if (!question || !question.correctquery) {
             console.warn(`No correct query found for Q${questionId} to compare against.`);
             setCorrectness(prev => ({ ...prev, [questionId]: 'Cannot Compare' }));
             return;
         }

         let expectedResultRows = [];
         try {
              // Need to run the *correct* query against the same student schema context
             let originalSearchPath = 'public';
             try {
                 const pathResult = await db.query("SHOW search_path;");
                 if (pathResult?.rows?.length > 0) originalSearchPath = pathResult.rows[0].search_path;
             } catch (e) {}

             await db.query(`SET search_path TO ${db.quoteIdent(studentSchema)}, public;`);
             const expectedResult = await db.query(question.correctquery);
             await db.query(`SET search_path TO ${originalSearchPath};`);
             expectedResultRows = expectedResult.rows;

         } catch (err) {
              console.error(`Error running correct query for Q${questionId}:`, err);
              setCorrectness(prev => ({ ...prev, [questionId]: 'Comparison Error' }));
              return;
         }

         // --- Basic Comparison (Replace with robust logic) ---
         // WARNING: This is a VERY basic check (stringified JSON comparison).
         // Real comparison needs to handle row order (if !orderindependent), column order, data types.
         const orderIndependent = question.orderindependent; // Get flag from question data
         let isMatch = false;
         if (orderIndependent) {
             // TODO: Implement order-independent set comparison (complex)
             // For now, just compare stringified sorted JSON as a placeholder
             const stringifySort = (rows) => JSON.stringify(rows.map(r => JSON.stringify(Object.entries(r).sort())).sort());
              isMatch = stringifySort(studentResultRows) === stringifySort(expectedResultRows);
              console.warn("Using basic order-independent check - needs proper implementation.");
         } else {
             // Order-dependent comparison
             isMatch = JSON.stringify(studentResultRows) === JSON.stringify(expectedResultRows);
         }

         setCorrectness(prev => ({ ...prev, [questionId]: isMatch ? 'Correct' : 'Incorrect' }));
         // --- End Basic Comparison ---
     };

     const openPlayground = (questionId) => {
         // TODO: Implement Query Playground Modal/Page
         alert(`Query Playground for Question ${questionId} - Not Implemented Yet`);
     };

    if (loading) return <div className="container"><p>Loading assignment...</p></div>;
    if (error && !assignment) return <div className="container"><p className="error">{error}</p></div>; // Show only error if assignment failed to load
    if (!assignment) return <div className="container"><p>Assignment not found.</p></div>; // Should be caught by error state, but as fallback

    return (
        <div className="container">
            <h2 className="heading">{assignment.assignmentname || `Assignment ${assignment.assignment_id}`}</h2>
            <p className="text-gray-400 mb-4">{assignment.description}</p>
             {!studentSchema && <p className="message error mb-4">Warning: No student database schema is loaded. Please use "Load Student DB". Queries cannot be run.</p>}

            {questions.map(q => (
                <div key={q.question_id} className="mb-8 p-4 border border-gray-700 rounded-lg bg-gray-800">
                    <h4 className="text-lg font-semibold mb-2">Question {q.question_id} ({q.totalmarks || 'N/A'} Marks)</h4>
                    <p className="text-gray-300 mb-3 whitespace-pre-wrap">{q.querytext}</p>

                    <textarea
                        rows="5"
                        className="textarea font-mono text-sm w-full"
                        placeholder={`Enter your SQL query for Question ${q.question_id}...`}
                        value={studentQueries[q.question_id] || ''}
                        onChange={(e) => handleQueryChange(q.question_id, e.target.value)}
                        disabled={!studentSchema || !db}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <div>
                            {/* TODO: Implement Playground */}
                            <button onClick={() => openPlayground(q.question_id)} className="button text-xs bg-gray-600 hover:bg-gray-500 mr-2">Query Playground</button>
                        </div>
                        <button
                            onClick={() => runStudentQuery(q.question_id)}
                            className="button bg-blue-600 hover:bg-blue-700"
                            disabled={!studentSchema || !db || !studentQueries[q.question_id]?.trim()}
                        >
                            Run & Check Query
                        </button>
                    </div>

                    {/* Display Query Results/Errors/Correctness */}
                     {queryErrors[q.question_id] && <p className="message error mt-3">{queryErrors[q.question_id]}</p>}
                     {queryResults[q.question_id] && !queryErrors[q.question_id] && (
                         <>
                            <h5 className='font-semibold mt-3 mb-1 text-gray-300'>Your Result:</h5>
                            <ResultTable rows={queryResults[q.question_id]} />
                         </>
                     )}
                    {correctness[q.question_id] && (
                         <p className={`message font-bold mt-3 ${correctness[q.question_id] === 'Correct' ? 'success' : correctness[q.question_id] === 'Incorrect' ? 'error' : 'info'}`}>
                             Status: {correctness[q.question_id]} {orderIndependent ? '(Order Independent Check)' : '(Order Dependent Check)'}
                         </p>
                    )}
                </div>
            ))}
             {questions.length === 0 && !loading && <p>No questions found for this assignment.</p>}
        </div>
    );
};

export default AssignmentAttemptPage;