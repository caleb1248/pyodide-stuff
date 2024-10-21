import {
  PublishDiagnosticsNotification,
  type ProtocolConnection,
} from 'vscode-languageserver-protocol/browser';
import * as monaco from 'monaco-editor';
import { toMarkerData } from 'monaco-languageserver-types';

export default function registerDiagnosticPublisher(connection: ProtocolConnection) {
  connection.onNotification(PublishDiagnosticsNotification.type, (diagnosticInfo) => {
    console.log(diagnosticInfo);
    const uri = monaco.Uri.parse(diagnosticInfo.uri);
    const model = monaco.editor.getModel(uri);
    if (!model) return;
    const version = model.getVersionId();
    if (version !== diagnosticInfo.version) return;

    monaco.editor.setModelMarkers(
      model,
      'pyright',
      diagnosticInfo.diagnostics.map((diagnostic) => toMarkerData(diagnostic)),
    );
  });
}
