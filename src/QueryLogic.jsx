// src/QueryLogic.js
import { parse } from 'pgsql-ast-parser';
import { toSqlFromAst } from './sqlGenerator';

const normalizeSql = (sql) => sql.trim().replace(/;+$/, '');

export const extractSubqueries = (ast) => {
  const subqueries = [];
  const seenSql = new Set();

  const addSubquery = (name, sql) => {
    const normalized = normalizeSql(sql);
    if (!seenSql.has(normalized)) {
      subqueries.push({ name, sql });
      seenSql.add(normalized);
    }
  };

  const traverse = (node, nameHint = '') => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'with' && node.clauses) {
      node.clauses.forEach(cte => {
        const subquerySql = toSqlFromAst(cte.query);
        addSubquery(cte.alias, subquerySql);
        traverse(cte.query, cte.alias);
      });
      traverse(node.statement);
      return;
    }

    if (node.type === 'select') {
      const fullSql = toSqlFromAst(node);
      addSubquery(nameHint || 'select', fullSql);

      if (node.from) {
        node.from.forEach(fromItem => {
          if (fromItem.type === 'subselect') {
            const subquerySql = toSqlFromAst(fromItem.query);
            addSubquery(fromItem.alias || 'subselect', subquerySql);
            traverse(fromItem.query);
          } else if (fromItem.type === 'statement' && fromItem.statement?.type === 'select') {
            const subquerySql = toSqlFromAst(fromItem.statement);
            addSubquery(fromItem.alias || 'subselect', subquerySql);
            traverse(fromItem.statement);
          } else if ((fromItem.type === 'derived_table' || fromItem.type === 'alias') && fromItem.query?.type === 'select') {
            const subquerySql = toSqlFromAst(fromItem.query);
            addSubquery(fromItem.alias || 'subselect', subquerySql);
            traverse(fromItem.query);
          } else if (fromItem.type === 'table') {
            const tableSql = `SELECT ${node.columns.map(col => col.expr?.name || '*').join(', ')} FROM ${fromItem.name.name}` + (node.where ? ` WHERE ${toSqlExpr(node.where)}` : '') + ';';
            addSubquery(fromItem.name.name, tableSql);
          }
        });
      }
    }

    Object.values(node).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(child => traverse(child));
      } else {
        traverse(value);
      }
    });
  };

  const astArray = Array.isArray(ast) ? ast : ast ? [ast] : [];
  astArray.forEach(stmt => traverse(stmt));
  return subqueries;
};

export const analyzeSubqueries = async (db, query) => {
  const results = [];
  try {
    const parsed = parse(query);
    const ast = Array.isArray(parsed) ? parsed : [parsed];
    const subqueries = extractSubqueries(parsed);
    for (const subquery of subqueries) {
      try {
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

function toSqlExpr(expr) {
  if (!expr) return '';
  switch (expr.type) {
    case 'ref':
      return expr.name;
    case 'string':
      return `'${expr.value}'`;
    case 'integer':
      return expr.value.toString();
    case 'call':
      return `${expr.function}(${expr.args.map(toSqlExpr).join(', ')})`;
    case 'binary':
      return `${toSqlExpr(expr.left)} ${expr.op} ${toSqlExpr(expr.right)}`;
    case 'unary':
      return `${expr.op} ${toSqlExpr(expr.operand)}`;
    case 'select':
      return `(${toSqlFromAst(expr)})`;
    default:
      return '/* unknown_expr */';
  }
}