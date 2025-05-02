// src/AssignmentListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePGlite } from '@electric-sql/pglite-react';

const AssignmentListPage = () => {
    const db = usePGlite();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // TODO: Add course selection later if needed
    const currentCourseId = 'cs387iitb_5705'; // Hardcoded for now

    useEffect(() => {
        const fetchAssignments = async () => {
            if (!db) {
                setError("Database connection not available.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setError('');
            try {
                // Fetch assignments for the current course
                const result = await db.query(
                    `SELECT assignment_id, assignmentname, description, starttime, endtime
                     FROM public.xdata_assignment
                     WHERE course_id = $1 ORDER BY assignment_id`,
                    [currentCourseId]
                );
                setAssignments(result.rows);
                if (result.rows.length === 0) {
                    setError(`No assignments found for course '${currentCourseId}'.`);
                }
            } catch (err) {
                console.error("Error fetching assignments:", err);
                setError(`Failed to fetch assignments: ${err.message}`);
                setAssignments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, [db, currentCourseId]);

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="heading">Assignments for {currentCourseId}</h2>
                 <Link
                    to="/assignments/new" // Link to the Add Assignment page
                    className="button bg-green-600 hover:bg-green-700 text-white"
                 >
                     Create New Assignment
                 </Link>
            </div>

            {loading && <p>Loading assignments...</p>}
            {error && <p className={`message ${assignments.length > 0 ? 'info' : 'error'}`}>{error}</p>}

            {!loading && assignments.length > 0 && (
                <ul>
                    {assignments.map((assignment) => (
                        <li key={assignment.assignment_id} className="listItem">
                            <Link to={`/assignments/${assignment.assignment_id}`} className="hover:text-blue-400">
                                <h3 className="text-xl font-semibold">
                                    {assignment.assignmentname || `Assignment ${assignment.assignment_id}`}
                                </h3>
                            </Link>
                            <p className="text-sm text-gray-400 mb-1">
                                ID: {assignment.assignment_id}
                                {assignment.starttime && ` | Starts: ${new Date(assignment.starttime).toLocaleString()}`}
                                {assignment.endtime && ` | Ends: ${new Date(assignment.endtime).toLocaleString()}`}
                            </p>
                            <p className="text-gray-300">{assignment.description || '(No description)'}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AssignmentListPage;