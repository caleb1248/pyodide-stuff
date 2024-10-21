import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import connection, { capabilities } from './lsp/lsp-main';
import { fromRange } from 'monaco-languageserver-types';
import {
  ApplyWorkspaceEditRequest,
  DidChangeTextDocumentNotification,
  DidOpenTextDocumentNotification,
  ServerCapabilities,
} from 'vscode-languageserver-protocol/browser';
import { registerCompletionProvider } from './glue/completion';
import registerHoverProvider from './glue/hover';
import registerDiagnosticPublisher from './glue/diagnostics';
import registerSignatureHelpProvider from './glue/callSignature';
connection;

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

const editor = monaco.editor.create(document.getElementById('editor')!, {
  theme: 'vs-dark',
});

window.addEventListener('resize', () => editor.layout());

connection.onRequest(ApplyWorkspaceEditRequest.type, (params) => {
  console.error('Workspace edit ' + params.label + 'requested', params.edit.changes);
  return {
    applied: false,
    failureReason: 'unsupported',
  };
});

registerDiagnosticPublisher(connection);
// @ts-ignore
globalThis.connection = connection;

function registerServerCapabilities(capabilities: ServerCapabilities) {
  if (capabilities.hoverProvider) {
    registerHoverProvider(connection);
  }

  if (capabilities.completionProvider) {
    registerCompletionProvider(connection, capabilities.completionProvider);
  }

  if (capabilities.signatureHelpProvider) {
    registerSignatureHelpProvider(connection, capabilities.signatureHelpProvider);
  }
}

const fullRangeMap = new WeakMap<monaco.editor.ITextModel, monaco.IRange>();

monaco.editor.onDidCreateModel((model) => {
  fullRangeMap.set(model, model.getFullModelRange());
});

monaco.editor.onWillDisposeModel((model) => {
  fullRangeMap.delete(model);
});

setTimeout(async () => {
  registerServerCapabilities(capabilities);
  monaco.editor.onDidCreateModel(async (model) => {
    const language = model.getLanguageId();
    if (language !== 'python') return;

    await connection.sendNotification(DidOpenTextDocumentNotification.type, {
      textDocument: {
        uri: model.uri.toString(),
        version: model.getVersionId(),
        text: model.getValue(),
        languageId: language,
      },
    });

    console.log('new document made');
  });

  editor.onDidChangeModelContent(async (e) => {
    const model = editor.getModel();
    if (!model) return;

    const fullRange = fullRangeMap.get(model)!;
    const text = model.getValue();

    fullRangeMap.set(model, model.getFullModelRange());

    await connection.sendNotification(DidChangeTextDocumentNotification.type, {
      textDocument: {
        uri: model.uri.toString(),
        version: e.versionId,
      },

      // contentChanges: e.changes.map((change) => ({
      //   range: fromRange(change.range),
      //   rangeLength: change.rangeLength,
      //   text: change.text,
      // })),
      contentChanges: [
        {
          range: fromRange(fullRange),
          text,
        },
      ],
    });

    console.log('changed model content!');
  });

  editor.setModel(
    monaco.editor.createModel('x:int=1\n' + 'x="hi"', 'python', monaco.Uri.file('/main.py')),
  );
}, 5000);

export default editor;
