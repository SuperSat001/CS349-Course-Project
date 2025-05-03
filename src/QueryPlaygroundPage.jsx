// src/QueryPlaygroundPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePGlite } from '@electric-sql/pglite-react';

// --- Reusable ResultTable (Modified to support highlighting) ---
const ResultTable = ({ rows, highlightedIndices = new Set(), highlightClass = 'highlight-default' }) => {
    // Guard Clauses for invalid input
    if (!rows) {
        return <p className="text-sm text-gray-400 mt-2">(No result data)</p>;
    }
    // Ensure rows is an array before trying to access length or keys
     if (!Array.isArray(rows)) {
          console.error("ResultTable received non-array rows:", rows);
         return <p className="message error mt-2">Invalid result format.</p>;
     }
    if (rows.length === 0) {
        return <p className="text-sm text-gray-400 mt-2">(Query returned no rows)</p>;
    }

    // Get headers from the first row (safe now due to length check)
    const headers = Object.keys(rows[0]);

    return (
        <div className="overflow-auto border border-gray-600 rounded max-h-96"> {/* Increased max height */}
            <table className="table text-xs w-full"> {/* Ensure table takes full width */}
                <thead className="sticky top-0 bg-gray-700 z-10">
                    <tr>
                        {headers.map((header) => <th key={header} className="th whitespace-nowrap">{header}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        // Apply highlighting class to the row if its index is in the set
                        <tr key={i} className={highlightedIndices.has(i) ? highlightClass : ''}>
                            {headers.map((header, j) => (
                                <td key={`${i}-${j}`} className="td">
                                    {typeof row[header] === 'boolean' ? String(row[header]) : (row[header] ?? <span className='italic text-gray-500'>NULL</span>)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
// --- End ResultTable ---

// --- Row Comparison and Highlighting Logic ---
const getHighlightingInfo = (studentRows = [], correctRows = [], orderMatters = false) => {
    const highlightedStudentIndices = new Set();
    const highlightedCorrectIndices = new Set();

    // Ensure inputs are arrays before proceeding
    if (!Array.isArray(studentRows) || !Array.isArray(correctRows)) {
         console.warn("Highlighting received non-array input", {studentRows, correctRows});
        return { highlightedStudentIndices, highlightedCorrectIndices };
    }

    // Normalize rows for comparison (stringify sorted key-value pairs)
    const normalizeRow = (row) => {
        if (!row || typeof row !== 'object') return JSON.stringify(row); // Handle non-objects defensively
        return JSON.stringify(Object.entries(row).sort());
    };

    const studentStrings = studentRows.map(normalizeRow);
    const correctStrings = correctRows.map(normalizeRow);

    if (orderMatters) {
        // Order matters: Compare element by element
        const maxLength = Math.max(studentStrings.length, correctStrings.length);
        for (let i = 0; i < maxLength; i++) {
            const studentRowStr = studentStrings[i];
            const correctRowStr = correctStrings[i];

            if (studentRowStr !== correctRowStr) {
                if (i < studentStrings.length) highlightedStudentIndices.add(i);
                if (i < correctStrings.length) highlightedCorrectIndices.add(i);
            }
        }
    } else {
        // Order doesn't matter: Use frequency counts
        const studentCounts = studentStrings.reduce((acc, str) => { acc[str] = (acc[str] || 0) + 1; return acc; }, {});
        const correctCounts = correctStrings.reduce((acc, str) => { acc[str] = (acc[str] || 0) + 1; return acc; }, {});

        // Find extra rows in student result
        studentStrings.forEach((str, index) => {
            if (correctCounts[str] > 0) { // Check if this row exists in correct counts
                 correctCounts[str]--; // Decrement count as we find a match
            } else {
                // If count is 0 or undefined, this student row is extra
                highlightedStudentIndices.add(index);
            }
        });

        // Reset correctCounts based on original correctStrings for finding missing rows
        const originalCorrectCounts = correctStrings.reduce((acc, str) => { acc[str] = (acc[str] || 0) + 1; return acc; }, {});
        studentStrings.forEach(str => { // Decrement based on student strings again
             if(originalCorrectCounts[str] > 0) {
                 originalCorrectCounts[str]--;
             }
        });

        // Find missing rows in correct result
        correctRows.forEach((row, index) => {
             const str = normalizeRow(row);
             // If the stringified row still has a positive count after decrementing based on student results,
             // it means the student didn't provide this instance.
             if (originalCorrectCounts[str] > 0) {
                 highlightedCorrectIndices.add(index);
                 originalCorrectCounts[str]--; // Mark this specific missing instance as found
             }
         });
    }

    return { highlightedStudentIndices, highlightedCorrectIndices };
};
// --- End Comparison Logic ---

// --- Separate Comparison Function for Status ---
const compareResultsForStatus = (studentRows, correctRows, orderIndependent) => {
    // Basic checks first
    if (!Array.isArray(studentRows) || !Array.isArray(correctRows)) return false;
    if (studentRows.length !== correctRows.length) return false;
    if (studentRows.length === 0) return true; // Both empty is considered equal

    // Check if column names/order match (essential for accurate comparison)
    if (studentRows.length > 0 && correctRows.length > 0) {
        const studentCols = Object.keys(studentRows[0]).sort();
        const correctCols = Object.keys(correctRows[0]).sort();
        if (JSON.stringify(studentCols) !== JSON.stringify(correctCols)) {
            console.warn("Column mismatch during status comparison.");
            return false; // Treat as non-match if columns differ
        }
    } else {
         // One has columns, the other doesn't (should have been caught by length check, but safe)
          return false;
    }


    // Normalize rows based on sorted column keys
    const normalizeRow = (row) => {
        if (!row || typeof row !== 'object') return JSON.stringify(row);
        return JSON.stringify(Object.entries(row).sort());
    };

    let studentData = studentRows.map(normalizeRow);
    let correctData = correctRows.map(normalizeRow);

    // Sort stringified rows if order doesn't matter
    if (orderIndependent) {
        studentData.sort();
        correctData.sort();
    }

    // Compare the final arrays of strings
    return JSON.stringify(studentData) === JSON.stringify(correctData);
};
// --- End Comparison Function for Status ---


const QueryPlaygroundPage = ({ studentSchema, selectedCourseId }) => { // Expect props from App.jsx
    const { assignmentId, questionId } = useParams();
    const navigate = useNavigate();
    const db = usePGlite();

    // --- State Variables ---
    const [questionDetails, setQuestionDetails] = useState(null);
    const [correctResult, setCorrectResult] = useState({ rows: [], error: null });
    const [studentQuery, setStudentQuery] = useState('');
    const [studentResult, setStudentResult] = useState({ rows: [], error: null });
    const [comparisonStatus, setComparisonStatus] = useState(null); // null | 'Matched' | 'Not Matched' | 'Error'
    const [loadingQuestion, setLoadingQuestion] = useState(true);
    const [loadingCorrect, setLoadingCorrect] = useState(false);
    const [loadingStudent, setLoadingStudent] = useState(false);
    const [orderMatters, setOrderMatters] = useState(false);
    const [highlightedStudentIndices, setHighlightedStudentIndices] = useState(new Set());
    const [highlightedCorrectIndices, setHighlightedCorrectIndices] = useState(new Set());
    // --- End State Variables ---

    // --- Fetch Question Details ---
    const fetchQuestion = useCallback(async () => {
         if (!db || !assignmentId || !questionId || !selectedCourseId) {
            setCorrectResult({ rows: [], error: 'Missing context to load question.' }); // Set error on correctResult for display
            setLoadingQuestion(false);
            return;
        }
        setLoadingQuestion(true);
        setQuestionDetails(null); // Reset details on fetch
        setCorrectResult({ rows: [], error: null }); // Reset correct results
        try {
            const res = await db.query(
                `SELECT question_id, querytext, correctquery, orderindependent
                 FROM public.xdata_qinfo
                 WHERE course_id = $1 AND assignment_id = $2 AND question_id = $3`,
                [selectedCourseId, assignmentId, questionId]
            );
            if (res.rows.length === 0) throw new Error('Question not found.');

            const details = res.rows[0];
            setQuestionDetails(details);
            // Use orderindependent flag from DB if available, otherwise default to false
            setOrderMatters(details.orderindependent === null ? false : !!details.orderindependent);

        } catch (err) {
            console.error("Error fetching question details:", err);
            setCorrectResult({ rows: [], error: `Failed to load question: ${err.message}` }); // Show error in correct panel
            setQuestionDetails(null);
        } finally {
            setLoadingQuestion(false);
        }
    }, [db, assignmentId, questionId, selectedCourseId]);

    // --- Run Correct Query ---
    const runCorrectQuery = useCallback(async () => {
         if (!db || !studentSchema || !questionDetails?.correctquery) {
              if (questionDetails && !questionDetails.correctquery) {
                 setCorrectResult({rows: [], error: "No correct query defined."});
              }
             return;
        }
        setLoadingCorrect(true);
        setCorrectResult({ rows: [], error: null }); // Reset
        const queryPrefix = `SET search_path TO "${studentSchema}", public;`;
        try {
            const result = await db.exec(`${queryPrefix} ${questionDetails.correctquery}`);
            console.log("--- RAW Correct Query Result ---", result);

            let correctRows = [];
            if (result && Array.isArray(result) && result.length > 1 && result[1] && typeof result[1].rows !== 'undefined') {
                 correctRows = Array.isArray(result[1].rows) ? result[1].rows : [];
                 console.log(`Correct query returned ${correctRows.length} rows.`);
                 setCorrectResult({ rows: correctRows, error: null });
            } else {
                console.warn("Correct query did not produce expected result structure:", result);
                setCorrectResult({ rows: [], error: "Correct query failed or returned unexpected data structure." });
            }

        } catch (err) {
            console.error("Error running correct query:", err);
            setCorrectResult({ rows: [], error: `Correct Query Error: ${err.message}` });
        } finally {
            setLoadingCorrect(false);
        }
    }, [db, studentSchema, questionDetails]);

    // --- Fetch question on load ---
    useEffect(() => {
        fetchQuestion();
    }, [fetchQuestion]);

    // --- Run correct query when question details/schema available ---
    useEffect(() => {
        if (questionDetails && studentSchema) {
            runCorrectQuery();
        } else {
            // Clear results if context changes
              setCorrectResult({ rows: [], error: studentSchema ? null : 'Student schema not active.' });
              setStudentResult({ rows: [], error: null});
              setHighlightedStudentIndices(new Set());
              setHighlightedCorrectIndices(new Set());
              setComparisonStatus(null); // Reset status
         }
    }, [questionDetails, studentSchema, runCorrectQuery]);


    // --- Run Student Query & Update Comparison ---
    const handleRunStudentQuery = async () => {
        if (!db || !studentSchema || !studentQuery.trim()) {
            setStudentResult({ rows: [], error: !studentSchema ? 'Student schema not active.' : 'Please enter a query.' });
            setHighlightedStudentIndices(new Set());
            setHighlightedCorrectIndices(new Set());
            setComparisonStatus('Error'); // Indicate error state
            return;
        }
        setLoadingStudent(true);
        setStudentResult({ rows: [], error: null });
        setHighlightedStudentIndices(new Set());
        setHighlightedCorrectIndices(new Set());
        setComparisonStatus(null); // Reset status

        let studentRows = [];
        const queryPrefix = `SET search_path TO "${studentSchema}", public;`;
        let currentStudentError = null; // Track error locally

        try {
            const result = await db.exec(`${queryPrefix} ${studentQuery}`);
            console.log("--- RAW Student Query Result ---", result);

             if (result && Array.isArray(result) && result.length > 1 && result[1] && typeof result[1].rows !== 'undefined') {
                 studentRows = Array.isArray(result[1].rows) ? result[1].rows : [];
                 console.log(`Student query returned ${studentRows.length} rows.`);
                 setStudentResult({ rows: studentRows, error: null });
             } else {
                 console.warn("Student query did not produce expected result array structure:", result);
                 currentStudentError = "Query failed or returned unexpected data structure.";
                 setStudentResult({ rows: [], error: currentStudentError });
             }

        } catch (err) {
            console.error("Error running student query:", err);
            currentStudentError = `Your Query Error: ${err.message}`;
            setStudentResult({ rows: [], error: currentStudentError });
        } finally {
             setLoadingStudent(false);

              // --- Calculate Highlights & Comparison Status (inside finally) ---
              const currentCorrectRows = Array.isArray(correctResult.rows) ? correctResult.rows : [];
              const highlights = getHighlightingInfo(studentRows, currentCorrectRows, orderMatters);
              setHighlightedStudentIndices(highlights.highlightedStudentIndices);
              setHighlightedCorrectIndices(highlights.highlightedCorrectIndices);

              if (currentStudentError || correctResult.error) {
                  setComparisonStatus('Error'); // If any error occurred
              } else {
                   // Perform comparison only if no errors
                   const isMatch = compareResultsForStatus(studentRows, currentCorrectRows, orderMatters);
                   setComparisonStatus(isMatch ? 'Matched' : 'Not Matched');
              }
             // --- End Calculation ---
        }
    }; // --- End handleRunStudentQuery ---

    // --- Recalculate highlights & status when 'orderMatters' or data changes ---
    useEffect(() => {
         const currentStudentRows = Array.isArray(studentResult.rows) ? studentResult.rows : [];
         const currentCorrectRows = Array.isArray(correctResult.rows) ? correctResult.rows : [];

         // Recalculate highlights
         const highlights = getHighlightingInfo(currentStudentRows, currentCorrectRows, orderMatters);
         setHighlightedStudentIndices(highlights.highlightedStudentIndices);
         setHighlightedCorrectIndices(highlights.highlightedCorrectIndices);

         // Recalculate comparison status only if results are present and no errors
         if (!studentResult.error && !correctResult.error && studentResult.rows !== null && correctResult.rows !== null) {
             // Only update status if student has run a query (don't reset to Not Matched on load)
              // We need a way to know if the student *has* run a query. Let's reuse comparisonStatus !== null.
              if(comparisonStatus !== null || currentStudentRows.length > 0){ // Update if already compared OR if student has rows now
                 const isMatch = compareResultsForStatus(currentStudentRows, currentCorrectRows, orderMatters);
                 setComparisonStatus(isMatch ? 'Matched' : 'Not Matched');
             }
         } else if (studentResult.error || correctResult.error) {
             setComparisonStatus('Error');
         }
         // Don't reset status to null here, only on new query run

    }, [orderMatters, studentResult.rows, correctResult.rows, studentResult.error, correctResult.error]); // Removed comparisonStatus from deps to avoid loops


    // --- Render Logic ---
    if (loadingQuestion) return <div className="container"><p>Loading question...</p></div>;
    if (!questionDetails && !correctResult.error) return <div className="container"><p className="message error">Could not load question details.</p></div>;
    if (correctResult.error && !questionDetails) return <div className="container"><p className="message error">{correctResult.error}</p></div>;


    return (
        <div className="container mx-auto p-4">
            {/* Header & Back Button */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="heading text-xl"> Query Playground (Assignment {assignmentId} / Question {questionId}) </h2>
                 <Link to={`/assignments/${assignmentId}/attempt`} className="button text-sm bg-gray-600 hover:bg-gray-700"> Back to Assignment </Link>
            </div>
            {/* Question Text */}
            {questionDetails?.querytext && (
                 <div className="mb-4 p-3 bg-gray-800 border border-gray-700 rounded">
                     <p className="text-gray-300 whitespace-pre-wrap">{questionDetails.querytext}</p>
                 </div>
            )}

             {/* Student Query Input Area & Controls */}
             <div className="mb-4">
                  <label htmlFor="student-query-input" className="label">Your SQL Query:</label>
                 <textarea
                     id="student-query-input"
                     rows="6"
                     className="textarea font-mono text-sm w-full"
                     placeholder={`-- Enter your query here...\n-- It will run against the active student schema: ${studentSchema || 'None selected!'}`}
                     value={studentQuery}
                     onChange={(e) => setStudentQuery(e.target.value)}
                     disabled={loadingStudent || loadingCorrect || !studentSchema} // Disable if correct is loading too
                 />
                 <div className="flex justify-between items-center mt-2">
                     <div className="flex items-center gap-2">
                          <input
                                type="checkbox"
                                id="order-matters-check"
                                checked={orderMatters}
                                onChange={(e) => setOrderMatters(e.target.checked)}
                                className="checkbox checkbox-sm" // Smaller checkbox
                                disabled={loadingStudent || loadingCorrect}
                            />
                          <label htmlFor="order-matters-check" className="text-sm text-gray-300 cursor-pointer">Order Matters</label> {/* Added cursor */}
                     </div>
                     <button
                         onClick={handleRunStudentQuery}
                         className="button bg-blue-600 hover:bg-blue-700"
                         disabled={loadingStudent || loadingCorrect || !studentSchema || !studentQuery.trim()}
                     >
                         {loadingStudent ? 'Running...' : 'Run Query & Compare'}
                     </button>
                 </div>
             </div>

            {/* Comparison Status Display */}
            <div className="my-4 text-center h-6"> {/* Give it a fixed height to prevent layout shifts */}
                {comparisonStatus === 'Matched' && (
                    <p className="message success font-semibold">✅ Results Match!</p>
                )}
                {comparisonStatus === 'Not Matched' && (
                    <p className="message error font-semibold">❌ Results Do Not Match.</p>
                )}
                 {comparisonStatus === 'Error' && (
                    <p className="message warning font-semibold">⚠️ Cannot compare results due to query errors.</p>
                )}
                 {/* No message displayed if comparisonStatus is null */}
            </div>


             {/* Display Area (Two Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Left Panel: Student Output */}
                 <div className='border border-gray-700 rounded p-3 bg-gray-800 min-h-[200px] flex flex-col'>
                    <h3 className="font-semibold mb-2 text-gray-200 flex-shrink-0">Your Output</h3>
                     {loadingStudent && <p className='message info text-center'>Running query...</p>}
                    {studentResult.error && <p className="message error whitespace-pre-wrap">{studentResult.error}</p>}
                    <div className='flex-grow overflow-auto'>
                         {!loadingStudent && !studentResult.error && (
                             <ResultTable rows={studentResult.rows} highlightedIndices={highlightedStudentIndices} highlightClass="highlight-extra"/>
                         )}
                    </div>
                 </div>

                 {/* Right Panel: Correct Output */}
                 <div className='border border-gray-700 rounded p-3 bg-gray-800 min-h-[200px] flex flex-col'>
                      <h3 className="font-semibold mb-2 text-gray-200 flex-shrink-0">Correct Output</h3>
                     {loadingCorrect && <p className='message info text-center'>Loading correct answer...</p>}
                     {!loadingCorrect && correctResult.error && <p className="message error whitespace-pre-wrap">{correctResult.error}</p>}
                      <div className='flex-grow overflow-auto'>
                          {!loadingCorrect && !correctResult.error && (
                              <ResultTable rows={correctResult.rows} highlightedIndices={highlightedCorrectIndices} highlightClass="highlight-missing"/>
                          )}
                      </div>
                 </div>
            </div> {/* End Grid */}
        </div> // End Container
    );
};

export default QueryPlaygroundPage;