const fs = require('fs');
const path = require('path');
const { test } = require('uvu');
const assert = require('uvu/assert');

const {
  _extractStartingComments,
  compile,
  optimize,
  generate,
} = require('../plugin.js');

function snapshot(fileName) {
  return fs.readFileSync(path.join(__dirname, fileName), 'utf8');
}

test('extractStartingComments()', () => {
  const graph = `
    # A simple digraph that connects two nodes in both directions

    # This is another comment
    # strict
    # digraph
    # graph
    graph {
        A -> B; # Connect A to B
        # Connect B back to A
        B -> A;
    }
  `.trim();

  assert.equal(_extractStartingComments(graph), {
    startingComments: [
      'A simple digraph that connects two nodes in both directions',
      '',
      'This is another comment',
      'strict',
      'digraph',
      'graph',
    ].join('\n'),
    body: `    graph {
        A -> B; # Connect A to B
        # Connect B back to A
        B -> A;
    }`,
  });
});

test('compile()', async () => {
  const graph = `
    # A simple digraph that connects two nodes in both directions
    digraph {
      A -> B; # Connect A to B
      B -> A; # Connect B back to A
    }
  `;

  const compiled = await compile(graph, 'svg', 'dot');
  assert.snapshot(compiled, snapshot('compile.svg'));
});

test('optimize()', async () => {
  const graph = `
    # A simple digraph that connects two nodes in both directions
    digraph {
      A -> B; # Connect A to B
      B -> A; # Connect B back to A
    }
  `;

  const compiled = await compile(graph, 'svg', 'dot');
  const optimized = await optimize(compiled);

  assert.snapshot(optimized.trim(), snapshot('optimize.svg').trim());
});

test('optimize()', async () => {
  const graph = `
    # A simple digraph that connects two nodes in both directions
    digraph {
      A -> B; # Connect A to B
      B -> A; # Connect B back to A
    }
  `;

  const compiled = await compile(graph, 'svg', 'dot');
  const optimized = await optimize(compiled);

  assert.snapshot(optimized.trim(), snapshot('optimize.svg').trim());
});

test('generate()', async () => {
  const graph = `
    # A simple digraph that connects two nodes in both directions
    digraph {
      A -> B; # Connect A to B
      B -> A; # Connect B back to A
    }
  `.trim();

  const compiled = await compile(graph, 'svg', 'dot');
  const optimized = await optimize(compiled);
  const svg = generate(optimized, graph);

  assert.snapshot(svg.trim(), snapshot('generate.svg').trim());
});

test.run();
