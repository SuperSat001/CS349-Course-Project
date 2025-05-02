import ExplainQuery from './ExplainQuery'
import ScanOptions from './ScanOptions'
import JoinOptions from './JoinOptions'
import SortOptions from './SortOptions'
import GroupOptions from './GroupOptions'

// Accept studentSchema prop from App.jsx
function QueryPlanning({ studentSchema }) {
  return (
      <div className="container">
          <h2 className="heading">Query Plan Analysis</h2>
            <>
                {/* Pass studentSchema down to ExplainQuery */}
                <ExplainQuery studentSchema={studentSchema} />
                {/* These components currently only set planner flags, so they don't strictly need the schema */}
                {/* If they evolve to show schema-specific info, pass studentSchema down */}
                <ScanOptions />
                <JoinOptions />
                <SortOptions />
                <GroupOptions />
            </>
      </div>
  );
}
export default QueryPlanning