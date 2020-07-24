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
    ],
    body: [
      '    graph {',
      '        A -> B; # Connect A to B',
      '        # Connect B back to A',
      '        B -> A;',
      '    }',
    ],
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

test('generate() with caption and description', async () => {
  const graph = `
    # A simple digraph that connects two nodes in both directions
    # A more detailed description of the graph here
    digraph {
      A -> B; # Connect A to B
      B -> A; # Connect B back to A
    }
  `.trim();

  const compiled = await compile(graph, 'svg', 'dot');
  const optimized = await optimize(compiled);
  const { svg, caption } = generate(optimized, graph, {
    firstCommentIsCaption: true,
    generateAriaDescription: true,
  });

  assert.snapshot(svg.trim(), snapshot('generate.svg').trim());
  assert.equal(
    caption,
    'A simple digraph that connects two nodes in both directions'
  );
});

test('generate() with caption, no description', async () => {
  const graph = `
      # A simple digraph that connects two nodes in both directions
      # A more detailed description of the graph here
      digraph {
        A -> B; # Connect A to B
        B -> A; # Connect B back to A
      }
    `.trim();

  const compiled = await compile(graph, 'svg', 'dot');
  const optimized = await optimize(compiled);
  const { svg, caption } = generate(optimized, graph, {
    firstCommentIsCaption: true,
    generateAriaDescription: false,
  });

  assert.snapshot(svg.trim(), snapshot('generate-no-description.svg').trim());
  assert.equal(
    caption,
    'A simple digraph that connects two nodes in both directions'
  );
});

test('generate() with description, no caption', async () => {
  const graph = `
        # A simple digraph that connects two nodes in both directions
        digraph {
          A -> B; # Connect A to B
          B -> A; # Connect B back to A
        }
      `.trim();

  const compiled = await compile(graph, 'svg', 'dot');
  const optimized = await optimize(compiled);
  const { svg, caption } = generate(optimized, graph, {
    firstCommentIsCaption: false,
    generateAriaDescription: true,
  });

  assert.snapshot(svg.trim(), snapshot('generate-no-caption.svg').trim());
  assert.equal(caption, undefined);
});

test('generate() with no caption, no description', async () => {
  const graph = `
        # A simple digraph that connects two nodes in both directions
        digraph {
          A -> B; # Connect A to B
          B -> A; # Connect B back to A
        }
      `.trim();

  const compiled = await compile(graph, 'svg', 'dot');
  const optimized = await optimize(compiled);
  const { svg, caption } = generate(optimized, graph, {
    firstCommentIsCaption: false,
    generateAriaDescription: false,
  });

  assert.snapshot(svg.trim(), optimized.trim());
  assert.equal(caption, undefined);
});

test.run();
