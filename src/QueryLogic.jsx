export const analyzeSubqueries = async (db, query) => {
  // console.log('Analyzing query:', query);
  const results = {
    results: [],
  };

  try {
    // Try EXPLAIN (ANALYZE, FORMAT JSON)
    let plan;
    try {
      console.log('Running EXPLAIN (ANALYZE, VERBOSE, FORMAT JSON)...');
      const explainResult = await db.query(`EXPLAIN (ANALYZE, VERBOSE, FORMAT JSON) ${query}`);
      const planData = explainResult.rows[0];
      if (!planData || !planData['QUERY PLAN']) {
        throw new Error('No valid QUERY PLAN in EXPLAIN output');
      }
      plan = planData['QUERY PLAN'][0];
    } catch (jsonErr) {
      console.warn('JSON EXPLAIN failed:', jsonErr.message);
    }

    // Extract subqueries from plan
    const planSubqueries = [];
    const extractSubplans = (node, parentNode = null, level = 0) => {
      if (!node || typeof node !== 'object') return;

      const planNode = node.Plan || node;
      console.log(planNode)
      const nodeType = planNode['Node Type'];
      //const name = `subquery_${planSubqueries.length + 1}`;
      const name = planNode['Alias'] || planNode['CTE Name'] || planNode['Subplan Name'] || `subquery_${planSubqueries.length + 1}`;  // need to check for more cases
      //const isSubquery = nodeType === 'Subquery Scan' || nodeType === 'CTE Scan' || nodeType === 'InitPlan';    // need to check for more cases
      const subqueryInfo = {
        name,
        nodeType,
        //cost: planNode['Total Cost'] || 0,
        actualTime: planNode['Actual Total Time'] || 0,
        rows: planNode['Actual Rows'] || 0,
      };

      results.results.push({
        name,
        // sql: subqueryInfo.sql,
        explain: [
          { '': `Subquery: ${name}` },
          { '': `  -> ${nodeType || 'Unknown'}` },
          // { '': `      Cost: ${subqueryInfo.cost.toFixed(2)}` },
          { '': `      Rows: ${subqueryInfo.rows}` },
          { '': `      Execution Time: ${subqueryInfo.actualTime.toFixed(3)} ms` },
        ],
        // isBottleneck: subqueryInfo.isBottleneck,
        // cost: subqueryInfo.cost,
        actualTime: subqueryInfo.actualTime,
        rows: subqueryInfo.rows,
      });

      planSubqueries.push(subqueryInfo);
      //console.log(`Detected subquery (level ${level}):`, subqueryInfo);

      // Traverse nested Plans and InitPlans
      if (planNode['Plans']) {
        console.log(`Node ${name} has ${planNode['Plans'].length} child plans`);
        planNode['Plans'].forEach((child) => extractSubplans(child, planNode, level + 1));
      }
    };

    // Start extraction of subqueries
    console.log('Extracting subplans...');
    extractSubplans(plan);

    // Ensure main query is included if no subqueries     !results.results.length
    if (!results.results.length) {
      console.log('No subqueries found, adding main query');  //include main query
      const executionTime = plan['Execution Time'] || 0;
      results.results.push({
        name: 'main_query',
        // sql: 'Unknown',
        explain: [{ '': `Execution Time: ${executionTime} ms` }],
        // isBottleneck: false,
        actualTime: executionTime,
        rows: plan.Plan?.['Actual Rows'] || 0,
      });
    }

    // console.log('Final results:', JSON.stringify(results, null, 2));
    return results;
  } catch (err) {
    console.error('Analysis failed:', err);
    throw new Error(`Failed to analyze query: ${err.message}`);
  }
};
