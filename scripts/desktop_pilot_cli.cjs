const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { createDesktopWorkbench } = require('../apps/desktop/dist/renderer/index.js');

const HELP_LINES = [
  'open <file> [familyHint] [htmlMode]',
  'status',
  'tree',
  'select <objectId>',
  'select-first-text',
  'hit <x> <y>',
  'move <dx> <dy>',
  'multiselect <id1> [id2] ...',
  'edit <text>',
  'promote <panel|legend|annotation_block|group_node>',
  'delete',
  'save-project <file>',
  'load-project <file>',
  'export-svg <file>',
  'export-html <file>',
  'snapshot <file>',
  'help',
  'quit',
];

function tokenize(line) {
  const tokens = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match = null;
  while ((match = re.exec(line)) !== null) {
    const raw = match[1] ?? match[2] ?? match[3] ?? '';
    tokens.push(raw.replace(/\\(["'])/g, '$1'));
  }
  return tokens;
}

function flattenTree(nodes) {
  const out = [];
  const walk = (list) => {
    for (const node of list) {
      out.push(node);
      walk(node.children || []);
    }
  };
  walk(nodes || []);
  return out;
}

function getSelectedId(snapshot) {
  return snapshot?.canvas?.selectedIds?.[0] ?? null;
}

function executeCommand(workbench, line) {
  const tokens = tokenize(line.trim());
  if (tokens.length === 0) return { ok: true, command: 'noop' };
  const command = tokens[0].toLowerCase();

  if (command === 'help') {
    return { ok: true, command, lines: HELP_LINES };
  }
  if (command === 'quit' || command === 'exit') {
    return { ok: true, command: 'quit', quit: true };
  }

  if (command === 'open') {
    const filePath = tokens[1];
    if (!filePath) throw new Error('open requires <file>');
    const familyHint = tokens[2] || 'unknown';
    const htmlMode = tokens[3] || 'limited';
    const view = workbench.importFromFile(filePath, familyHint, htmlMode);
    return {
      ok: true,
      command,
      file: filePath,
      familyHint,
      htmlMode,
      treeCount: view.objectTree.length,
      family: view.importReport?.familyClassifiedAs ?? null,
      warnings: view.warnings,
    };
  }

  if (command === 'status') {
    const view = workbench.snapshot();
    const status = workbench.linkedStatus();
    return {
      ok: true,
      command,
      selectedId: getSelectedId(view),
      treeCount: view.objectTree.length,
      importFamily: view.importReport?.familyClassifiedAs ?? null,
      warnings: view.warnings,
      linked: status,
    };
  }

  if (command === 'tree') {
    const view = workbench.snapshot();
    const flat = flattenTree(view.objectTree).map((node) => ({
      id: node.id,
      objectType: node.objectType,
      label: node.label,
      childCount: node.children.length,
    }));
    return { ok: true, command, treeCount: view.objectTree.length, flat };
  }

  if (command === 'select') {
    if (!tokens[1]) throw new Error('select requires <objectId>');
    const view = workbench.selectById(tokens[1]);
    return { ok: true, command, selectedId: getSelectedId(view) };
  }

  if (command === 'select-first-text') {
    const view = workbench.selectFirstEditableText();
    return { ok: true, command, selectedId: getSelectedId(view) };
  }

  if (command === 'hit') {
    if (!tokens[1] || !tokens[2]) throw new Error('hit requires <x> <y>');
    const x = Number(tokens[1]);
    const y = Number(tokens[2]);
    const view = workbench.selectAtPoint(x, y);
    return { ok: true, command, selectedId: getSelectedId(view), hit: view.canvas.lastHit };
  }

  if (command === 'move') {
    if (!tokens[1] || !tokens[2]) throw new Error('move requires <dx> <dy>');
    const dx = Number(tokens[1]);
    const dy = Number(tokens[2]);
    const view = workbench.moveSelected(dx, dy);
    return { ok: true, command, selectedId: getSelectedId(view), overlayCount: view.canvas.overlays.length };
  }

  if (command === 'multiselect') {
    const ids = tokens.slice(1).flatMap((token) => token.split(',')).map((v) => v.trim()).filter(Boolean);
    if (ids.length === 0) throw new Error('multiselect requires object ids');
    const view = workbench.multiSelectByIds(ids);
    return { ok: true, command, selectedIds: view.canvas.selectedIds };
  }

  if (command === 'edit') {
    const text = tokens.slice(1).join(' ');
    if (!text) throw new Error('edit requires <text>');
    const view = workbench.editSelectedText(text);
    return {
      ok: true,
      command,
      selectedId: getSelectedId(view),
      text: view.properties?.extra?.content ?? null,
    };
  }

  if (command === 'promote') {
    const role = tokens[1];
    if (!role) throw new Error('promote requires <role>');
    const view = workbench.promoteSelection(role, 'desktop_pilot_cli');
    return { ok: true, command, role, selectedIds: view.canvas.selectedIds, treeCount: view.objectTree.length };
  }

  if (command === 'delete') {
    const view = workbench.deleteSelected();
    return { ok: true, command, selectedIds: view.canvas.selectedIds, treeCount: view.objectTree.length };
  }

  if (command === 'save-project') {
    if (!tokens[1]) throw new Error('save-project requires <file>');
    workbench.saveProjectToFile(tokens[1]);
    return { ok: true, command, file: tokens[1] };
  }

  if (command === 'load-project') {
    if (!tokens[1]) throw new Error('load-project requires <file>');
    const view = workbench.loadProjectFromFile(tokens[1]);
    return { ok: true, command, file: tokens[1], treeCount: view.objectTree.length };
  }

  if (command === 'export-svg') {
    if (!tokens[1]) throw new Error('export-svg requires <file>');
    workbench.exportSvgToFile(tokens[1]);
    return { ok: true, command, file: tokens[1] };
  }

  if (command === 'export-html') {
    if (!tokens[1]) throw new Error('export-html requires <file>');
    workbench.exportHtmlToFile(tokens[1]);
    return { ok: true, command, file: tokens[1] };
  }

  if (command === 'snapshot') {
    if (!tokens[1]) throw new Error('snapshot requires <file>');
    const view = workbench.snapshot();
    fs.writeFileSync(tokens[1], JSON.stringify(view, null, 2), 'utf8');
    return { ok: true, command, file: tokens[1], treeCount: view.objectTree.length };
  }

  throw new Error(`Unknown command: ${command}`);
}

function runBatch(commandsFilePath, options = {}) {
  const workbench = createDesktopWorkbench();
  const text = fs.readFileSync(commandsFilePath, 'utf8');
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  const results = [];

  for (const line of lines) {
    try {
      const result = executeCommand(workbench, line);
      const out = { line, ...result };
      results.push(out);
      if (options.print !== false) console.log(JSON.stringify(out));
      if (result.quit) break;
    } catch (error) {
      const out = {
        line,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      results.push(out);
      if (options.print !== false) console.log(JSON.stringify(out));
      if (options.stopOnError !== false) break;
    }
  }
  return results;
}

function runInteractive() {
  const workbench = createDesktopWorkbench();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'desktop> ' });
  console.log('Easy Plot Desktop Pilot CLI v0.01');
  console.log('Type "help" for commands.');
  rl.prompt();

  rl.on('line', (line) => {
    try {
      const result = executeCommand(workbench, line);
      console.log(JSON.stringify(result));
      if (result.quit) {
        rl.close();
        return;
      }
    } catch (error) {
      console.log(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
    rl.prompt();
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const batchIdx = args.indexOf('--batch');
  if (batchIdx >= 0) {
    const commandsFilePath = args[batchIdx + 1];
    if (!commandsFilePath) {
      console.error('Missing commands file after --batch');
      process.exit(1);
    }
    const results = runBatch(path.resolve(commandsFilePath));
    const hasError = results.some((entry) => entry.ok === false);
    if (hasError) process.exit(1);
    process.exit(0);
  }
  runInteractive();
}

module.exports = {
  runBatch,
  executeCommand,
  tokenize,
};
