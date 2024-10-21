import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import './lsp/lsp-main';

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

const editor = monaco.editor.create(document.getElementById('editor')!, {
  theme: 'vs-dark',
  automaticLayout: true,
});

export default editor;
