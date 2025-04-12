export const analyzeSubqueries = async (db, query) => {
  const results = { results: [] };

  // Suggestion Generator
  const generateSuggestion = (node) => {
    const nodeType = node['Node Type'];
    const actualTime = node['Actual Total Time'] || 0;
    const rows = node['Actual Rows'] || 0;
    const relationName = node['Relation Name'] || '';
    const filter = node['Filter'] || '';
    const joinType = node['Join Type'] || '';
    const indexName = node['Index Name'] || '';
    const suggestions = [];

    // Heuristics
    if (actualTime > 10) {
      suggestions.push(`⚠️ High execution time (${actualTime.toFixed(2)} ms). Consider optimizing this part.`);
    }

    if (nodeType === 'Seq Scan' && rows > 1000) {
      suggestions.push(`🔍 Sequential scan on large dataset (${rows} rows) on "${relationName}". Consider adding an index or filtering earlier.`);
    }

    if (nodeType === 'Nested Loop' && rows > 100 && actualTime > 5) {
      suggestions.push(`🔁 Nested Loop with large rows. Consider using Hash Join or ensuring join keys are indexed.`);
    }

    if (nodeType === 'Sort' && rows > 1000) {
      suggestions.push(`↕️ Sort on large rows. Try to reduce rows before sort or add indexes that support ordering.`);
    }

    if (nodeType === 'Aggregate' && rows > 10000) {
      suggestions.push(`📊 Expensive aggregation on ${rows} rows. Consider materializing data or filtering earlier.`);
    }

    if (nodeType === 'Hash Join' && actualTime > 10) {
      suggestions.push(`🧮 Hash Join is slow. Check if join keys are indexed or reduce dataset size before join.`);
    }

    if (nodeType === 'Index Scan' && indexName && actualTime > 10) {
      suggestions.push(`📁 Index Scan using "${indexName}" is slow. Consider index optimization or better filtering.`);
    }

    if (nodeType === 'CTE Scan' && actualTime > 5) {
      suggestions.push(`📦 CTE Scan is taking time. Inline the CTE if it’s used only once or materialize if reused.`);
    }

    if (nodeType === 'Subquery Scan' && actualTime > 5) {
      suggestions.push(`🔄 Subquery Scan is slow. Consider converting to JOIN or ensuring subquery is efficient.`);
    }

    if (filter.includes('OR')) {
      suggestions.push(`⚠️ Using OR in filters can prevent index usage. Try rewriting with UNION or using indexed expressions.`);
    }
    console.log(nodeType);
    return suggestions;
  };

  try {
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

    const planSubqueries = [];
    const extractSubplans = (node, parentNode = null, level = 0) => {
      if (!node || typeof node !== 'object') return;

      const planNode = node.Plan || node;
      const nodeType = planNode['Node Type'];
      const name = planNode['Alias'] || planNode['CTE Name'] || planNode['Subplan Name'] || `subquery_${planSubqueries.length + 1}`;

      const subqueryInfo = {
        name,
        nodeType,
        actualTime: planNode['Actual Total Time'] || 0,
        rows: planNode['Actual Rows'] || 0,
      };

      const suggestions = generateSuggestion(planNode);

      results.results.push({
        name,
        explain: [
          { '': `Subquery: ${name}` },
          { '': `  -> ${nodeType || 'Unknown'}` },
          { '': `      Rows: ${subqueryInfo.rows}` },
          { '': `      Execution Time: ${subqueryInfo.actualTime.toFixed(3)} ms` },
        ],
        actualTime: subqueryInfo.actualTime,
        rows: subqueryInfo.rows,
        suggestions,
      });

      planSubqueries.push(subqueryInfo);

      if (planNode['Plans']) {
        planNode['Plans'].forEach((child) => extractSubplans(child, planNode, level + 1));
      }
    };

    console.log('Extracting subplans...');
    extractSubplans(plan);

    if (!results.results.length) {
      console.log('No subqueries found, adding main query');
      const executionTime = plan['Execution Time'] || 0;
      results.results.push({
        name: 'main_query',
        explain: [{ '': `Execution Time: ${executionTime} ms` }],
        actualTime: executionTime,
        rows: plan.Plan?.['Actual Rows'] || 0,
        suggestions: generateSuggestion(plan.Plan || {}),
      });
    }

    // Identify and flag the bottleneck
    const bottleneck = results.results.reduce((max, r) =>
      (r.actualTime > (max?.actualTime || 0)) ? r : max, null);
    if (bottleneck) {
      bottleneck.isBottleneck = true;
      bottleneck.suggestions.push("🔥 This is the most time-consuming part of the query.");
    }

    return results;
  } catch (err) {
    console.error('Analysis failed:', err);
    throw new Error(`Failed to analyze query: ${err.message}`);
  }
};
