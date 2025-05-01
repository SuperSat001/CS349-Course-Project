import ExplainQuery from './ExplainQuery'
import ScanOptions from './ScanOptions'
import JoinOptions from './JoinOptions'
import SortOptions from './SortOptions'
import GroupOptions from './GroupOptions'

function QueryPlanning() {
  return (
      <div className="container">
          <h2 className="heading">Query Plan Analysis</h2>
            <>
                <p className="mb-4 text-gray-400 text-sm">Use the input below to run EXPLAIN ANALYZE...</p>
                <ExplainQuery />
                <ScanOptions />
                <JoinOptions />
                <SortOptions />
                <GroupOptions />
            </>
      </div>
  );
}
export default QueryPlanning
