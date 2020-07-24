const SVGO = require('svgo/lib/svgo');
const { graphviz } = require('node-graphviz');

module.exports.compile = compile;
module.exports.optimize = optimize;
module.exports.generate = generate;

// From the default settings in SVGOMG, extracted using:
// (https://github.com/jakearchibald/svgomg/blob/1f2e05d30058a61dc17a5fa3bb49163010661203/src/js/page/ui/settings.js#L111-L145)
const defaultSvgoPlugins = {
  removeDoctype: true,
  removeXMLProcInst: true,
  removeComments: true,
  removeMetadata: true,
  removeXMLNS: false,
  removeEditorsNSData: true,
  cleanupAttrs: true,
  inlineStyles: true,
  minifyStyles: true,
  convertStyleToAttrs: true,
  cleanupIDs: true,
  removeRasterImages: false,
  removeUselessDefs: true,
  cleanupNumericValues: true,
  cleanupListOfValues: false,
  convertColors: true,
  removeUnknownsAndDefaults: true,
  removeNonInheritableGroupAttrs: true,
  removeUselessStrokeAndFill: true,
  removeViewBox: true,
  cleanupEnableBackground: true,
  removeHiddenElems: true,
  removeEmptyText: true,
  convertShapeToPath: true,
  moveElemsAttrsToGroup: true,
  moveGroupAttrsToElems: true,
  collapseGroups: true,
  convertPathData: true,
  convertEllipseToCircle: true,
  convertTransform: true,
  removeEmptyAttrs: true,
  removeEmptyContainers: true,
  mergePaths: true,
  removeUnusedNS: true,
  reusePaths: false,
  sortAttrs: false,
  sortDefsChildren: true,
  removeTitle: true,
  removeDesc: true,
  removeDimensions: false,
  removeStyleElement: false,
  removeScriptElement: false,
};

function compile(dotSource, outputFormat, layout, callback) {
  return graphviz
    .layout(dotSource, outputFormat, layout)
    .then((svg) => {
      if (callback) {
        callback(null, svg);
      } else {
        return svg;
      }
    })
    .catch((error) => {
      if (callback) {
        callback(error);
      } else {
        throw error;
      }
    });
}

function optimize(svgSource, svgoPlugins, callback) {
  const plugins = Object.assign({}, defaultSvgoPlugins, svgoPlugins);

  const svgo = new SVGO({
    // Takes an object that maps plugin names to booleans indicating
    // whether the plugin is enabled and creates a list of objects
    // that configure one plugin each. Basically:
    // { [key: string]: boolean } => { [singleKey: string]: boolean }[]
    plugins: Object.keys(plugins).map((key) => {
      return { [key]: plugins[key] };
    }),
  });

  return svgo
    .optimize(svgSource)
    .then((result) => {
      if (callback) {
        callback(null, result.data);
      } else {
        return result.data;
      }
    })
    .catch((error) => {
      if (callback) {
        callback(error);
      } else {
        throw error;
      }
    });
}

function generate(svg, dotSource) {
  // Gets the starting comments in the graph, to use as alt text
  const { startingComments, body: code } = extractStartingComments(dotSource);

  // For accessibility, we modify the SVG to include 'role' and 'aria-label' attributes,
  // and insert a <title> and <desc> at the root (https://stackoverflow.com/a/4756461)
  const title = startingComments
    ? escapeHtml(startingComments)
    : 'SVG diagram of graph generated from DOT notation';
  const desc = escapeHtml(code);
  const ariaLabel = startingComments
    ? escapeAttribute(startingComments)
    : 'SVG diagram of graph generated from DOT notation: ' +
      escapeAttribute(code);

  const svgPartsRegex = /(<svg)(?<attributes>[\S\s]*?)>(?<body>[\S\s]*?)<\/svg>/;
  const found = svg.match(svgPartsRegex);

  let attributes = found.groups.attributes || '';
  attributes = ` role="img" aria-label="${ariaLabel}"` + attributes;

  let body = found.groups.body || '';
  body = `<title>${title}</title><desc>${desc}</desc>` + body;

  return `<svg ${attributes}>${body}</svg>`;
}

// Lines that start with 'digraph', 'graph', or 'strict', without a '#' at
// the beginning are considered the start of the graph's source.
// This allows for picking all the lines starting with '#' before the
// start of the graph's source to use as alt text
const isStartOfGraph = /(?<!#.*)(?:(?:(?:di)?graph)|strict)/;

/**
 * Extract the starting comments and body from the given DOT source code.
 * Starting comments are lines beginning with '#' that appear at the
 * top of the graph, before the first source line.
 */
function extractStartingComments(code) {
  const lines = code.split(/\r?\n/);
  const commentLines = [];

  let line = lines.shift();

  while (line !== undefined && !isStartOfGraph.test(line)) {
    commentLines.push(line.trim().replace('#', '').trim());
    line = lines.shift();
  }

  // Reinsert the last line that was removed to test
  lines.unshift(line);

  return {
    startingComments: commentLines.join('\n'),
    body: lines.join('\n'),
  };
}

// Export privately for testing
module.exports._extractStartingComments = extractStartingComments;

/**
 * Escape the given value for use in an HTML element attribute.
 */
function escapeAttribute(unsafe, preserveCR = true) {
  const newline = preserveCR ? '&#13;' : '\n';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, newline)
    .replace(/[\r\n]/g, newline);
}

// Export privately for testing
module.exports._escapeAttribute = escapeAttribute;

/**
 * Escape the given value for use in HTML
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export privately for testing
module.exports._escapeHtml = escapeHtml;
