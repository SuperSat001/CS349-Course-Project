// src/AssignmentListPage.jsx
import React, { useState, useEffect } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';
import { useNavigate, useParams } from 'react-router-dom'

const AssignmentListPage = ({selectedCourseId}) => {
    const db = usePGlite();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentCourseName, setCurrentCourseName] = useState('');

    useEffect(() => {
        const fetchAssignmentsAndCourse = async () => {
            if (!db) { /* ... */ return; }
            if (!selectedCourseId) { /* ... */ return; }

            setLoading(true);
            setError('');
            try {
                // Fetch course name
                const courseRes = await db.query('SELECT course_name FROM public.xdata_course WHERE instructor_course_id = $1', [selectedCourseId]);
                setCurrentCourseName(courseRes.rows[0]?.course_name || selectedCourseId);

                // Fetch assignments (no 'published' column needed now)
                const result = await db.query(
                    `SELECT assignment_id, assignmentname, description, starttime, endtime
                     FROM public.xdata_assignment
                     WHERE course_id = $1 ORDER BY assignment_id`,
                    [selectedCourseId]
                );
                setAssignments(result.rows);
                if (result.rows.length === 0) {
                    setError(`No assignments found for course '${currentCourseName || selectedCourseId}'. You can create one!`);
                }
            } catch (err) {
                console.error("Error fetching assignments:", err);
                setError(`Failed to fetch assignments: ${err.message}. Ensure 'xdata_assignment' table exists.`);
                setAssignments([]); // Clear assignments on error
             }
             finally { setLoading(false); }
        };
        fetchAssignmentsAndCourse();
    }, [db, selectedCourseId]);

    const goToAddAssignment = () => navigate('/assignments/new');
    const goToEditAssignment = (assignmentId) => navigate(`/assignments/${assignmentId}/edit`);
    const goToAttemptAssignment = (assignmentId) => navigate(`/assignments/${assignmentId}/attempt`);

 // --- Render Logic ---
 if (!selectedCourseId) {
    return <div className="container"><p className="message info">Please select a course first.</p></div>;
}

return (
    <div className="container">
        <div className="flex justify-between items-center mb-4">
             <h2 className="heading">Assignments for: {loading ? '...' : (currentCourseName || 'Selected Course')}</h2>
             <button
                onClick={goToAddAssignment}
                className="button bg-green-600 hover:bg-green-700 text-white"
                disabled={loading}
             > Create New Assignment </button>
        </div>

        {loading && <p>Loading assignments...</p>}
        {error && <p className={`message ${assignments.length > 0 || error.includes('Failed') ? 'info' : 'error'}`}>{error}</p>}

        {!loading && assignments.length > 0 && (
            <ul>
                {assignments.map((assignment) => (
                    <li key={assignment.assignment_id} className="listItem flex justify-between items-start gap-4">
                        {/* Details */}
                        <div className="flex-grow">
                            <h3 className="text-xl font-semibold">
                                {assignment.assignmentname || `Assignment ${assignment.assignment_id}`}
                            </h3>
                            <p className="text-sm text-gray-400 mb-1">ID: {assignment.assignment_id}</p>
                            <p className="text-gray-300">{assignment.description || '(No description)'}</p>
                        </div>
                         {/* Actions */}
                         <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2">
                             <button
                                 onClick={() => goToEditAssignment(assignment.assignment_id)}
                                 className="button text-xs bg-blue-600 hover:bg-blue-700"
                             > Edit/Manage Questions </button>
                              <button
                                 onClick={() => goToAttemptAssignment(assignment.assignment_id)}
                                 className="button text-xs bg-gray-600 hover:bg-gray-700"
                                 title="Attempt Assignment"
                             > Attempt </button>
                         </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
);
};

export default AssignmentListPage;