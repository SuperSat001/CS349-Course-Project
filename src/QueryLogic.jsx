import { parse, toSql, astVisitor } from 'pgsql-ast-parser';

const extractSubqueries = (ast) => {
  const subqueries = [];
  let subqueryCounter = 0;

  const visitor = astVisitor((map) => ({
    // Handle CTEs in WITH clauses
    with: (w) => {
      console.log("Visiting WITH clause:", w);
      if (w.bind) {
        w.bind.forEach((cte) => {
          if (cte.statement && cte.statement.type === 'select') {
            subqueryCounter++;
            const subquerySql = toSql.statement(cte.statement);
            subqueries.push({
              name: cte.alias.name || `cte_${subqueryCounter}`,
              sql: subquerySql,
            });
            console.log(`Found CTE: ${subquerySql}`);
          }
        });
      }
      map.super().with(w);
    },

    // Handle subqueries in FROM clauses
    from: (f) => {
      console.log("Visiting FROM clause:", f);
      const fromItems = Array.isArray(f) ? f : f ? [f] : [];
      fromItems.forEach((fromItem) => {
        if (fromItem.type === 'statement' && fromItem.statement.type === 'select') {
          subqueryCounter++;
          const subquerySql = toSql.statement(fromItem.statement);
          subqueries.push({
            name: fromItem.alias || `subquery_${subqueryCounter}`,
            sql: subquerySql,
          });
          console.log(`Found FROM subquery: ${subquerySql}`);
        }
      });
      map.super().from(f);
    },

    // Handle subqueries in WHERE clauses
    where: (w) => {
      console.log("Visiting WHERE clause:", w);
      if (w) {
        if (w.type === 'binary' && w.op === 'IN' && w.right && w.right.type === 'select') {
          subqueryCounter++;
          const subquerySql = toSql.statement(w.right);
          subqueries.push({
            name: `subquery_${subqueryCounter}`,
            sql: subquerySql,
          });
          console.log(`Found IN subquery: ${subquerySql}`);
        } else if (w.type === 'call' && w.function.name === 'exists' && w.args[0].type === 'select') {
          subqueryCounter++;
          const subquerySql = toSql.statement(w.args[0]);
          subqueries.push({
            name: `subquery_${subqueryCounter}`,
            sql: subquerySql,
          });
          console.log(`Found EXISTS subquery: ${subquerySql}`);
        }
      }
      map.super().where(w); // Rely on natural recursion
    },

    // Handle subqueries in SELECT clause (columns)
    select: (s) => {
      console.log("Visiting SELECT clause:", s);
      if (s && s.columns) {
        s.columns.forEach((col) => {
          if (col.expr && col.expr.type === 'select') {
            subqueryCounter++;
            const subquerySql = toSql.statement(col.expr);
            subqueries.push({
              name: `subquery_${subqueryCounter}`,
              sql: subquerySql,
            });
            console.log(`Found SELECT subquery: ${subquerySql}`);
          }
        });
      }
      map.super().select(s);
    },
    // Handle subqueries in JOIN clauses
    join: (j) => {
      console.log("Visiting JOIN clause:", j);
      if (j && j.right && j.right.type === 'select') {
        subqueryCounter++;
        const subquerySql = toSql.statement(j.right);
        subqueries.push({
          name: `subquery_${subqueryCounter}`,
          sql: subquerySql,
        });
        console.log(`Found JOIN subquery: ${subquerySql}`);
      }
      map.super().join(j);
    },

    // // Log all SELECT statements
    // statement: (s) => {
    //   console.log("Visiting statement:", s);
    //   if (s.type === 'select') {
    //     console.log("Processing SELECT statement:", toSql.statement(s));
    //   }
    //   map.super().statement(s);
    // },
  }));

  console.log("Starting AST traversal...");
  if (Array.isArray(ast)) {
    ast.forEach((statement) => {
      console.log("Traversing statement:", toSql.statement(statement));
      visitor.statement(statement);
    });
  } else {
    console.log("Traversing single statement:", toSql.statement(ast));
    visitor.statement(ast);
  }

  console.log("Extracted subqueries:", subqueries);
  return subqueries;
};

export const analyzeSubqueries = async (db, query) => {
  const results = [];
  try {
    const parsed = parse(query); // Parse the SQL query into an AST
    console.log("Parsed AST:", parsed);
    const ast = Array.isArray(parsed) ? parsed : [parsed];
    console.log("Input AST:", JSON.stringify(parsed, null, 2));
    const subqueries = extractSubqueries(parsed); // Extract subqueries
    console.log("Extracted Subqueries:", subqueries);

    for (const subquery of subqueries) {
      try {
        console.log("Subquery SQL:", subquery.sql);
        const explain = await db.query(`EXPLAIN ANALYZE ${subquery.sql}`);
        results.push({ name: subquery.name, sql: subquery.sql, explain: explain.rows });
      } catch (err) {
        results.push({ name: subquery.name, sql: subquery.sql, error: err.message });
      }
    }
    return { ast, subqueries, results };
  } catch (err) {
    console.error("Query parsing or execution failed:", err);
    throw new Error(`Failed to parse query: ${err.message}`);
  }
};