const deasync = require('deasync');
const visit = require('unist-util-visit');

const { compile, optimize, generate } = require('./plugin.js');

const compileSync = deasync(compile);
const optimizeSync = deasync(optimize);

const defaultPluginOptions = {
  optimize: true,
  wrapperTag: 'div',
  wrapperClass: 'remark-graphviz-graph',
};

const languageTags = [
  'circo',
  'dot',
  'fdp',
  'neato',
  'osage',
  'patchwork',
  'twopi',
];

module.exports = function gatsbyRemarkGraphviz(
  { markdownAST, reporter },
  { optimize, wrapperClass, wrapperTag, svgoPlugins } = {}
) {
  const options = merge(defaultPluginOptions, {
    optimize,
    wrapperClass,
    wrapperTag,
  });

  visit(markdownAST, 'code', (node) => {
    // The code block language is our layout for GraphViz
    const layout = node.lang ? node.lang.trim().toLowerCase() : '';

    if (layout && languageTags.includes(layout)) {
      try {
        // Compile the graph using GraphViz
        const compiled = compileSync(node.value, 'svg', layout);

        // Optimize the SVG with SVGO if the user has allowed it
        const optimized = options.optimize
          ? optimizeSync(compiled, svgoPlugins)
          : compiled;

        // Generate the SVG with accessibility information
        const svg = generate(optimized, node.value);

        // Replace the code node in the AST with the generated SVG, wrapped in a container
        node.type = 'html';
        node.children = undefined;
        node.value = `<${options.wrapperTag} class="${options.wrapperClass}">${svg}</${options.wrapperTag}>`;
      } catch (error) {
        reporter.error(
          '[gatsby-remark-graphviz]: GraphViz compilation failed: ' + error
        );
      }
    }
  });

  return markdownAST;
};

/**
 * Like Object.assign(), but doesn't modify any of the arguments,
 * and skips keys that have the value `undefined`.
 */
function merge(...args) {
  const merged = {};

  args.forEach((arg) => {
    Object.keys(arg).forEach((key) => {
      if (arg[key] !== undefined) {
        merged[key] = arg[key];
      }
    });
  });

  return merged;
}
