// @ts-check

const visit = require('unist-util-visit');

const { compile, optimize, generate } = require('./plugin.js');

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
  } = {},
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

  const graphvizNodes = [];

  visit(markdownAST, 'code', (node) => {
    // The code block language is our layout for GraphViz
    const layout = node.lang ? node.lang.trim().toLowerCase() : '';

    if (layout && languageTags.includes(layout)) {
      graphvizNodes.push({ node, layout });
    }
  });

  const generations = graphvizNodes.map(({ node, layout }) => {
    return generateDiagramAndReplaceNode(
      node,
      layout,
      options,
      svgoPlugins,
    ).catch((error) => {
      reporter.error(
        '[gatsby-remark-graphviz]: GraphViz compilation failed: ' + error,
      );
    });
  });

  return Promise.all(generations).then(() => {
    return markdownAST;
  });
};

async function generateDiagramAndReplaceNode(
  node,
  layout,
  options,
  svgoPlugins,
) {
  // Compile the graph using GraphViz
  const compiled = await compile(node.value, 'svg', layout);

  let optimized = compiled;

  // Optimize the SVG with SVGO if the user has allowed it
  if (options.optimize) {
    optimized = await optimize(compiled, svgoPlugins);
  }

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
      (caption
        ? `<figcaption class="${options.figcaptionClass}">${caption}</figcaption>`
        : '') +
      `</figure>`;
  } else {
    node.value = `<${options.wrapperTag} class="${options.wrapperClass}">${svg}</${options.wrapperTag}>`;
  }
}

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
