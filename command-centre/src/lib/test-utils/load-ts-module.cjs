const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTsModule(filePath, options = {}) {
  const source = fs.readFileSync(filePath, "utf-8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filePath,
  });

  const stubs = options.stubs || {};
  const module = { exports: {} };

  const localRequire = (request) => {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) {
      return stubs[request];
    }

    if (request.startsWith("@/")) {
      throw new Error(`Missing stub for ${request} while loading ${path.basename(filePath)}`);
    }

    return require(request);
  };

  const compiled = new Function(
    "require",
    "module",
    "exports",
    "__dirname",
    "__filename",
    outputText,
  );
  compiled(localRequire, module, module.exports, path.dirname(filePath), filePath);
  return module.exports;
}

module.exports = {
  loadTsModule,
};
