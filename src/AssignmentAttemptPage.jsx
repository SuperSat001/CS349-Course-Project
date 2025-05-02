// src/AssignmentAttemptPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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


const AssignmentAttemptPage = ({ studentSchema }) => { // Expect studentSchema prop
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const db = usePGlite(); // This is the MAIN connection, not the student schema instance
    const [assignment, setAssignment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [studentQueries, setStudentQueries] = useState({});
    const [queryResults, setQueryResults] = useState({});
    const [queryErrors, setQueryErrors] = useState({});
    const [correctness, setCorrectness] = useState({});

    // Fetch assignment and question details (from MAIN DB)
    useEffect(() => {
        const fetchAssignmentData = async () => {
            if (!db || !assignmentId) {
                setError("Database connection or Assignment ID missing.");
                setLoading(false); return;
            }
            setLoading(true); setError('');
            try {
                // Fetch assignment details - Assuming assignmentId is globally unique for simplicity
                // If not, you'd need the courseId context here too.
                const assgnRes = await db.query(
                    'SELECT * FROM public.xdata_assignment WHERE assignment_id = $1',
                    [assignmentId]
                );
                if (assgnRes.rows.length === 0) throw new Error(`Assignment ID ${assignmentId} not found.`);
                const fetchedAssignment = assgnRes.rows[0];
                setAssignment(fetchedAssignment);

                // Fetch questions using the course_id from the fetched assignment
                const courseId = fetchedAssignment.course_id;
                if (!courseId) throw new Error(`Course ID missing for assignment ${assignmentId}.`);

                const qinfoRes = await db.query(
                    'SELECT * FROM public.xdata_qinfo WHERE course_id = $1 AND assignment_id = $2 ORDER BY question_id',
                    [courseId, assignmentId]
                );
                setQuestions(qinfoRes.rows);

                // Initialize state objects based on questions
                const initialQueries = {};
                const initialResults = {};
                const initialErrors = {};
                const initialCorrectness = {};
                qinfoRes.rows.forEach(q => {
                    initialQueries[q.question_id] = '';
                    initialResults[q.question_id] = null;
                    initialErrors[q.question_id] = null;
                    initialCorrectness[q.question_id] = null;
                });
                setStudentQueries(initialQueries);
                setQueryResults(initialResults);
                setQueryErrors(initialErrors);
                setCorrectness(initialCorrectness);

            } catch (err) {
                console.error("Error fetching assignment data for attempt:", err);
                setError(`Failed to load assignment: ${err.message}`);
                setAssignment(null); setQuestions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchAssignmentData();
    }, [db, assignmentId]);

    const handleQueryChange = (questionId, queryText) => {
        setStudentQueries(prev => ({ ...prev, [questionId]: queryText }));
    };

    // --- runStudentQuery (Needs the active studentSchema prop) ---
    const runStudentQuery = async (questionId) => {
        const studentQuery = studentQueries[questionId];
        // Check if studentSchema is active!
        if (!studentSchema || !db) {
            setQueryErrors(prev => ({ ...prev, [questionId]: 'ERROR: No active student database schema selected. Please load or select one.' }));
            setQueryResults(prev => ({ ...prev, [questionId]: null }));
            setCorrectness(prev => ({ ...prev, [questionId]: null }));
            return;
        }
        if (!studentQuery || !studentQuery.trim()) {
            setQueryErrors(prev => ({ ...prev, [questionId]: 'Please enter a query.' }));
            setQueryResults(prev => ({ ...prev, [questionId]: null }));
            setCorrectness(prev => ({ ...prev, [questionId]: null }));
            return;
        }

        // Clear previous results/errors for this question
        setQueryErrors(prev => ({ ...prev, [questionId]: null }));
        setQueryResults(prev => ({ ...prev, [questionId]: null }));
        setCorrectness(prev => ({ ...prev, [questionId]: null }));

        let currentResult = null;
        let currentError = null;
        let originalSearchPath = 'public'; // Default

        try {
            // Get current path to restore it later
            const pathResult = await db.query("SHOW search_path;");
            if (pathResult?.rows?.length > 0) originalSearchPath = pathResult.rows[0].search_path;

            // IMPORTANT: Set search_path to the selected student schema
            await db.query(`SET search_path TO "${studentSchema}", public;`); // Use quotes for safety
            console.log(`Executing student query in schema "${studentSchema}": ${studentQuery}`);

            // Execute the student's query
            currentResult = await db.query(studentQuery);

        } catch (err) {
            console.error(`Error running student query for Q${questionId} in schema ${studentSchema}:`, err);
            currentError = `Query Error: ${err.message}`;
        } finally {
            // ALWAYS try to restore the original search path
            try {
                await db.query(`SET search_path TO ${originalSearchPath};`);
                console.log(`Search path restored to: ${originalSearchPath}`);
            } catch (e) { console.error("Failed to restore search path", e); }
        }

        // Update state with results or errors
        setQueryResults(prev => ({ ...prev, [questionId]: currentResult?.rows || null }));
        setQueryErrors(prev => ({ ...prev, [questionId]: currentError }));

        // If successful, attempt to compare results
        if (currentResult && !currentError) {
            compareResults(questionId, currentResult.rows);
        }
        // --- TODO: Log attempt to xdata_student_log ---
        // INSERT INTO xdata_student_log (course_id, assignment_id, question_id, rollnum, eventtime, querytext)
        // VALUES ($1, $2, $3, $4, NOW(), $5);
        // Need rollnum/student identifier from somewhere (context, auth?)
    };

    // --- compareResults (Runs correct query against studentSchema too) ---
    const compareResults = async (questionId, studentResultRows) => {
        const question = questions.find(q => q.question_id === questionId);
        if (!question || !question.correctquery) { /* ... handle no correct query ... */ return; }
        if (!studentSchema || !db) { /* ... handle no active schema ... */ return; } // Need schema here too!

        let expectedResultRows = [];
        let comparisonError = null;
        let originalSearchPath = 'public';

        try {
            // Get current path
            const pathResult = await db.query("SHOW search_path;");
            if (pathResult?.rows?.length > 0) originalSearchPath = pathResult.rows[0].search_path;

            // Set context to student schema to run the CORRECT query
            await db.query(`SET search_path TO "${studentSchema}", public;`);
            console.log(`Executing correct query for Q${questionId} in schema "${studentSchema}"`);
            const expectedResult = await db.query(question.correctquery);
            expectedResultRows = expectedResult.rows;

        } catch (err) {
            console.error(`Error running correct query for Q${questionId}:`, err);
            comparisonError = 'Comparison Error (Failed to run correct query)';
        } finally {
            // ALWAYS try to restore the original search path
            try { await db.query(`SET search_path TO ${originalSearchPath};`); }
            catch (e) { console.error("Failed to restore search path after running correct query", e); }
        }

        if (comparisonError) {
            setCorrectness(prev => ({ ...prev, [questionId]: comparisonError }));
            return;
        }

        // --- Comparison Logic (Basic placeholder - needs robust implementation) ---
        const orderIndependent = question.orderindependent;
        let isMatch = false;
        // ... (Your existing JSON stringify comparison or a more robust one) ...
        try {
            if (orderIndependent) {
                const stringifySort = (rows) => JSON.stringify(rows.map(r => JSON.stringify(Object.entries(r).sort())).sort());
                isMatch = stringifySort(studentResultRows) === stringifySort(expectedResultRows);
            } else {
                isMatch = JSON.stringify(studentResultRows) === JSON.stringify(expectedResultRows);
            }
        } catch (stringifyError) {
            console.error("Error during result comparison (stringify):", stringifyError);
            setCorrectness(prev => ({ ...prev, [questionId]: 'Comparison Failed (Internal Error)' }));
            return;
        }

        setCorrectness(prev => ({ ...prev, [questionId]: isMatch ? 'Correct' : 'Incorrect' }));
    };

    // --- openPlayground (Keep as placeholder or implement) ---
    const openPlayground = (questionId) => { /* ... */ };

    // --- Render Logic ---
    if (loading) return <div className="container"><p>Loading assignment...</p></div>;
    if (error) return <div className="container"><p className="error">{error}</p><button onClick={() => navigate(-1)} className="button mt-4">Go Back</button></div>;
    if (!assignment) return <div className="container"><p className="info">Assignment data not loaded.</p><button onClick={() => navigate(-1)} className="button mt-4">Go Back</button></div>;

    return (
        <div className="container">
            <h2 className="heading">{assignment.assignmentname || `Assignment ${assignment.assignment_id}`}</h2>
            <p className="text-gray-400 mb-4">{assignment.description}</p>
            {/* Show warning if no student schema is selected */}
            {!studentSchema && <p className="message error mb-4">Warning: No student database schema is active. Please use the dropdown (or 'Load Student DB') to select one before running queries.</p>}

            {questions.map(q => (
                <div key={q.question_id} className="mb-8 p-4 border border-gray-700 rounded-lg bg-gray-800">
                    <h4 className="text-lg font-semibold mb-2">Question {q.question_id} ({q.totalmarks || 'N/A'} Marks)</h4>
                    <p className="text-gray-300 mb-3 whitespace-pre-wrap">{q.querytext}</p> {/* Display Question Text */}

                    <textarea
                        rows="5"
                        className="textarea font-mono text-sm w-full"
                        placeholder={`Enter your SQL query for Question ${q.question_id}...`}
                        value={studentQueries[q.question_id] || ''}
                        onChange={(e) => handleQueryChange(q.question_id, e.target.value)}
                        disabled={!studentSchema || !db} // Disable if no active student schema
                    />
                    <div className="flex items-center justify-between mt-2">
                        {/* Playground Button */}
                        <div>
                            <button onClick={() => openPlayground(q.question_id)} className="button text-xs bg-gray-600 hover:bg-gray-500 mr-2">Query Playground</button>
                        </div>
                        {/* Run Button */}
                        <button
                            onClick={() => runStudentQuery(q.question_id)}
                            className="button bg-blue-600 hover:bg-blue-700"
                            // Disable if no active schema OR no query entered
                            disabled={!studentSchema || !db || !studentQueries[q.question_id]?.trim()}
                        > Run & Check Query </button>
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
                            Status: {correctness[q.question_id]} {questions.find(qu => qu.question_id === q.question_id)?.orderindependent ? '(Order Independent Check)' : '(Order Dependent Check)'}
                        </p>
                    )}
                </div>
            ))}
            {questions.length === 0 && !loading && <p>No questions found for this assignment.</p>}
            {/* Add a back button */}
            <div className="mt-6">
                <button onClick={() => navigate(-1)} className="button bg-gray-600 hover:bg-gray-700"> Back </button>
            </div>
        </div>
    );
};

export default AssignmentAttemptPage;