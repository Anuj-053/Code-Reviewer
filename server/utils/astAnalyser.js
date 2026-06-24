const parser = require('@babel/parser');

/**
 * Recursively walks an AST node, calling visitor for every node.
 */
function walk(node, visitor, parent) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visitor(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => walk(c, visitor, node));
    } else if (child && typeof child === 'object' && child.type) {
      walk(child, visitor, node);
    }
  }
}

/**
 * Calculate nesting depth at a given node by walking ancestors.
 * We track depth via a simple counter by walking function/block scope nodes.
 */
function calcNestingDepth(node, ast) {
  // Simple approach: count how many ancestor functions wrap this node
  let depth = 0;
  const functionTypes = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ObjectMethod',
    'ClassMethod',
  ]);
  const ifTypes = new Set(['IfStatement', 'ForStatement', 'WhileStatement', 'SwitchStatement']);

  function countDepth(current, target, currentDepth) {
    if (!current || typeof current !== 'object') return -1;
    if (current === target) return currentDepth;

    for (const key of Object.keys(current)) {
      const child = current[key];
      let newDepth = currentDepth;
      if (child && typeof child === 'object' && child.type) {
        if (functionTypes.has(child.type) || ifTypes.has(child.type)) newDepth++;
        const result = countDepth(child, target, newDepth);
        if (result !== -1) return result;
      } else if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c === 'object') {
            let nd = newDepth;
            if (c.type && (functionTypes.has(c.type) || ifTypes.has(c.type))) nd++;
            const result = countDepth(c, target, nd);
            if (result !== -1) return result;
          }
        }
      }
    }
    return -1;
  }
  return countDepth(ast, node, 0);
}

/**
 * Analyse JavaScript/TypeScript code using Babel parser.
 * Returns a formatted string summary of findings.
 */
function analyseCode(code) {
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'dynamicImport'],
      errorRecovery: true,
    });
  } catch (err) {
    return `AST parsing failed: ${err.message}`;
  }

  const functions = [];
  const consoleLogLines = [];
  const debuggerLines = [];
  const letDeclarations = {}; // name -> { line, reassigned }

  // Track function depth by maintaining a scope stack
  const functionStack = [];
  const functionTypes = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ObjectMethod',
    'ClassMethod',
  ]);
  const blockDepthTypes = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'IfStatement',
    'ForStatement',
    'WhileStatement',
    'DoWhileStatement',
    'SwitchStatement',
    'TryStatement',
    'ObjectMethod',
    'ClassMethod',
  ]);

  // We do two passes: first collect let declarations, then detect reassignments
  walk(ast, (node) => {
    // Collect let declarations
    if (node.type === 'VariableDeclaration' && node.kind === 'let') {
      for (const decl of node.declarations) {
        if (decl.id && decl.id.type === 'Identifier') {
          letDeclarations[decl.id.name] = {
            line: node.loc ? node.loc.start.line : 0,
            reassigned: false,
          };
        }
      }
    }

    // Detect reassignments
    if (node.type === 'AssignmentExpression') {
      const left = node.left;
      if (left && left.type === 'Identifier' && letDeclarations[left.name]) {
        letDeclarations[left.name].reassigned = true;
      }
    }
    if (node.type === 'UpdateExpression') {
      const arg = node.argument;
      if (arg && arg.type === 'Identifier' && letDeclarations[arg.name]) {
        letDeclarations[arg.name].reassigned = true;
      }
    }

    // console.log detection
    if (
      node.type === 'CallExpression' &&
      node.callee &&
      node.callee.type === 'MemberExpression' &&
      node.callee.object &&
      node.callee.object.name === 'console'
    ) {
      const line = node.loc ? node.loc.start.line : 0;
      consoleLogLines.push(line);
    }

    // debugger detection
    if (node.type === 'DebuggerStatement') {
      const line = node.loc ? node.loc.start.line : 0;
      debuggerLines.push(line);
    }
  });

  // Collect functions with nesting depth using a stack-based walk
  let nestingDepth = 0;
  function walkDepth(node) {
    if (!node || typeof node !== 'object') return;
    if (!node.type) return;

    const isDepthNode = blockDepthTypes.has(node.type);
    if (isDepthNode) nestingDepth++;

    if (functionTypes.has(node.type)) {
      let name = 'anonymous';
      if (node.type === 'FunctionDeclaration' && node.id) {
        name = node.id.name;
      } else if (
        node.type === 'FunctionExpression' &&
        node.id
      ) {
        name = node.id.name;
      } else if (node.parent && node.parent.type === 'VariableDeclarator' && node.parent.id) {
        name = node.parent.id.name;
      }

      const line = node.loc ? node.loc.start.line : 0;
      const params = node.params ? node.params.length : 0;
      functions.push({ name, line, params, depth: nestingDepth });
    }

    for (const key of Object.keys(node)) {
      if (['type', 'loc', 'start', 'end', 'tokens', 'comments'].includes(key)) continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((c) => {
          if (c && typeof c === 'object' && c.type) {
            c.parent = node;
            walkDepth(c);
          }
        });
      } else if (child && typeof child === 'object' && child.type) {
        child.parent = node;
        walkDepth(child);
      }
    }

    if (isDepthNode) nestingDepth--;
  }
  walkDepth(ast.program);

  // Build summary string
  const lines = [];

  lines.push('=== AST Analysis Summary ===');

  // Functions found
  if (functions.length === 0) {
    lines.push('Functions: None detected');
  } else {
    lines.push(`\nFunctions (${functions.length} total):`);
    for (const fn of functions) {
      lines.push(`  - ${fn.name}() at line ${fn.line} | params: ${fn.params} | nesting depth: ${fn.depth}`);
    }
  }

  // High nesting depth (>3)
  const deepFunctions = functions.filter((f) => f.depth > 3);
  if (deepFunctions.length > 0) {
    lines.push(`\n⚠️  Deep nesting (>3 levels):`);
    for (const fn of deepFunctions) {
      lines.push(`  - ${fn.name}() at line ${fn.line} (depth: ${fn.depth})`);
    }
  }

  // Functions with >4 params
  const manyParams = functions.filter((f) => f.params > 4);
  if (manyParams.length > 0) {
    lines.push(`\n⚠️  Functions with >4 parameters:`);
    for (const fn of manyParams) {
      lines.push(`  - ${fn.name}() at line ${fn.line} (${fn.params} params)`);
    }
  }

  // console.log usage
  if (consoleLogLines.length > 0) {
    lines.push(`\n⚠️  console.log/debug calls found at lines: ${consoleLogLines.join(', ')}`);
  }

  // debugger statements
  if (debuggerLines.length > 0) {
    lines.push(`\n🔴 debugger statements found at lines: ${debuggerLines.join(', ')}`);
  }

  // let variables never reassigned
  const neverReassigned = Object.entries(letDeclarations)
    .filter(([, v]) => !v.reassigned)
    .map(([name, v]) => `${name} (line ${v.line})`);
  if (neverReassigned.length > 0) {
    lines.push(`\n💡 let variables never reassigned (should be const): ${neverReassigned.join(', ')}`);
  }

  return lines.join('\n');
}

module.exports = analyseCode;
