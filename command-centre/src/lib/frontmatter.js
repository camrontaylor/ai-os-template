const yaml = require("js-yaml");

function parseMarkdownFrontmatter(raw) {
  const text = String(raw || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    return {
      data: {},
      content: text,
    };
  }

  const parsed = yaml.load(match[1]) || {};
  const data =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};

  return {
    data,
    content: text.slice(match[0].length),
  };
}

function stringifyMarkdownFrontmatter(content, data) {
  const safeData = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const frontmatter = yaml.dump(safeData, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  const body = String(content || "").trim();

  return `---\n${frontmatter.trimEnd()}\n---\n\n${body}\n`;
}

module.exports = {
  parseMarkdownFrontmatter,
  stringifyMarkdownFrontmatter,
};
