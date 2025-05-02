// src/AddCourseForm.jsx
import React, { useState } from 'react';
import { usePGlite } from '@electric-sql/pglite-react';

// Props:
// - onCourseAdded: Callback function to notify parent (CourseList) that a course was added
// - onCancel: Callback function to hide the form
const AddCourseForm = ({ onCourseAdded, onCancel }) => {
  const db = usePGlite();
  const [instructorCourseId, setInstructorCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddCourse = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setMessage('');
    setIsLoading(true);

    if (!db) {
      setMessage('Error: Database connection not available.');
      setIsLoading(false);
      return;
    }

    // Basic validation - instructor_course_id is the PK and NOT NULL
    if (!instructorCourseId.trim()) {
        setMessage('Error: Instructor Course ID is required.');
        setIsLoading(false);
        return;
    }

    // Construct SQL query for public.xdata_course
    // We omit the 'course_id' column, assuming it's nullable or handled by the DB
    // Use parameters to prevent SQL injection
    const sql = `
      INSERT INTO public.xdata_course
        (instructor_course_id, course_name, year, semester, description)
      VALUES ($1, $2, $3, $4, $5);
    `;

    // Prepare parameters, handling potential empty strings as NULL for numeric/optional fields
    const params = [
      instructorCourseId.trim(),
      courseName.trim() || null, // Use NULL if empty
      year.trim() ? Number(year.trim()) : null, // Convert to number or NULL
      semester.trim() || null,
      description.trim() || null,
    ];

    try {
      await db.query(sql, params);
      setMessage('Course added successfully!');
      // Clear the form
      setInstructorCourseId('');
      setCourseName('');
      setYear('');
      setSemester('');
      setDescription('');
      // Notify parent component to refresh the list
      if (onCourseAdded) {
        onCourseAdded();
      }
      // Optionally hide form after a short delay
      // setTimeout(onCancel, 1500);
    } catch (err) {
      console.error("Error adding course:", err);
      // Provide specific feedback if possible (e.g., duplicate key)
      if (err.message.includes('duplicate key value violates unique constraint "xdata_course_pkey"')) {
           setMessage(`Error: Course with ID "${instructorCourseId}" already exists.`);
      } else {
           setMessage(`Error adding course: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-600 rounded-lg mt-6 mb-4 bg-gray-800">
      <h3 className="text-lg font-semibold mb-3 text-white">Add New Course</h3>
      <form onSubmit={handleAddCourse}>
        <div className="mb-3">
          <label htmlFor="instructor_course_id" className="block text-sm font-medium text-gray-300 mb-1">
            Instructor Course ID* (e.g., CS101_F25)
          </label>
          <input
            type="text"
            id="instructor_course_id"
            value={instructorCourseId}
            onChange={(e) => setInstructorCourseId(e.target.value)}
            className="input"
            required
            maxLength="30"
            disabled={isLoading}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="course_name" className="block text-sm font-medium text-gray-300 mb-1">
            Course Name
          </label>
          <input
            type="text"
            id="course_name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="input"
            maxLength="100"
            disabled={isLoading}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
                 <label htmlFor="year" className="block text-sm font-medium text-gray-300 mb-1">
                   Year (e.g., 2025)
                 </label>
                 <input
                   type="number"
                   id="year"
                   value={year}
                   onChange={(e) => setYear(e.target.value)}
                   className="input"
                   disabled={isLoading}
                 />
            </div>
            <div>
                <label htmlFor="semester" className="block text-sm font-medium text-gray-300 mb-1">
                   Semester (e.g., Fall, Spring, 1)
                 </label>
                 <input
                   type="text"
                   id="semester"
                   value={semester}
                   onChange={(e) => setSemester(e.target.value)}
                   className="input"
                    maxLength="50"
                   disabled={isLoading}
                 />
            </div>
        </div>

        <div className="mb-3">
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="textarea"
            disabled={isLoading}
          />
        </div>

        {/* Display feedback message */}
        {message && (
          <p className={`message text-sm mb-3 ${message.includes('Error:') ? 'error' : 'success'}`}>
            {message}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel} // Use the cancel callback
            className="button text-sm bg-gray-600 hover:bg-gray-700 text-white"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button text-sm bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading || !db}
          >
            {isLoading ? 'Adding...' : 'Add Course'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCourseForm;