import ExplainQuery from './ExplainQuery'
import ScanOptions from './ScanOptions'
import JoinOptions from './JoinOptions'
import SortOptions from './SortOptions'
import GroupOptions from './GroupOptions'

function QueryPlanning() {
    return (
<div style={{ paddingTop: '50px' }}>
  <ExplainQuery />
  <ScanOptions />
  <JoinOptions />
  <SortOptions />
  <GroupOptions />
</div>
    )
  }
export default QueryPlanning
