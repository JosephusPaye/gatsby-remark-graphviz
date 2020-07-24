const deasync = require('deasync');
const visit = require('unist-util-visit');

const { compile, optimize, generate } = require('./plugin.js');

const compileSync = deasync(compile);
const optimizeSync = deasync(optimize);

const defaultPluginOptions = {
  optimize: true,
  wrapperTag: 'div',
  wrapperClass: 'remark-graphviz-graph',
  figureClass: 'remark-graviz-figure',
  figcaptionClass: 'remark-graviz-figcaption',
  firstCommentIsCaption: true,
  generateAriaDescription: true,
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
  {
    optimize,
    wrapperTag,
    wrapperClass,
    figureClass,
    figcaptionClass,
    generateAriaDescription,
    firstCommentIsCaption,
    svgoPlugins,
  } = {}
) {
  const options = merge(defaultPluginOptions, {
    optimize,
    wrapperTag,
    wrapperClass,
    figureClass,
    figcaptionClass,
    firstCommentIsCaption,
    generateAriaDescription,
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

        // Generate the SVG with accessibility information if enabled
        const { svg, caption } = generate(optimized, node.value, {
          firstCommentIsCaption: options.firstCommentIsCaption,
          generateAriaDescription: options.generateAriaDescription,
        });

        // Replace the code node in the AST with the generated SVG, wrapped in a container
        node.type = 'html';
        node.children = undefined;

        if (options.firstCommentIsCaption) {
          node.value =
            `<figure class="${options.figureClass}">` +
            `<${options.wrapperTag} class="${options.wrapperClass}">${svg}</${options.wrapperTag}>` +
            `<figcaption class="${options.figcaptionClass}">${
              caption || ''
            }</figcaption>` +
            `</figure>`;
        } else {
          node.value = `<${options.wrapperTag} class="${options.wrapperClass}">${svg}</${options.wrapperTag}>`;
        }
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
