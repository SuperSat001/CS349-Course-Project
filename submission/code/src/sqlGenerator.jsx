export function toSqlFromAst(ast) {
    if (!ast || typeof ast !== 'object') {
      throw new Error('Invalid AST node');
    }
  
    if (ast.type === 'with') {
      const ctes = ast.bind.map(cte => {
        return `${cte.alias.name} AS (${toSqlFromAst(cte.statement)})`;
      }).join(', ');
      return `WITH ${ctes} ${toSqlFromAst(ast.in)}`;
    }
  
    if (ast.type === 'select') {
      const columns = ast.columns.map(col => {
        const expr = col.expr;
        if (!expr || typeof expr !== 'object') return '*';
        if (expr.type === 'ref') {
          return expr.name;
        } else if (expr.type === 'string') {
          return `'${expr.value}'`;
        } else if (expr.type === 'integer') {
          return expr.value.toString();
        } else if (expr.type === 'call') {
          const args = expr.args.map(toSqlExpr).join(', ');
          return `${expr.function}(${args})`;
        } else {
          return '*'; // fallback for unsupported expr
        }
      }).join(', ');
  
      const fromClause = ast.from?.map(fromItem => {
        if (fromItem.type === 'table') {
          return fromItem.name.name + (fromItem.alias ? ` AS ${fromItem.alias}` : '');
        } else if (fromItem.type === 'subselect') {
          return `(${toSqlFromAst(fromItem.query)})` + (fromItem.alias ? ` AS ${fromItem.alias}` : '');
        } else if (fromItem.type === 'statement') {
          return `(${toSqlFromAst(fromItem.statement)})` + (fromItem.alias ? ` AS ${fromItem.alias}` : '');
        } else if (fromItem.type === 'alias' && fromItem.query) {
          return `(${toSqlFromAst(fromItem.query)}) AS ${fromItem.alias}`;
        } else {
          return ''; // fallback
        }
      }).filter(Boolean).join(', ');
  
      const whereClause = ast.where ? ` WHERE ${toSqlExpr(ast.where)}` : '';
      const limitClause = ast.limit ? ` LIMIT ${ast.limit.value}` : '';
  
      return `SELECT ${columns} FROM ${fromClause}${whereClause}${limitClause}`;
    }
  
    throw new Error(`Unsupported AST type: ${ast.type}`);
  }
  
  function toSqlExpr(expr) {
    if (!expr || typeof expr !== 'object') {
      console.warn('Invalid or missing expression:', expr);
      return '/* invalid_expr */';
    }
  
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
        console.warn('Unhandled expression type:', expr.type, expr);
        return '/* unknown_expr */';
    }
  }
  