import * as monaco from 'monaco-editor';
import {
  fromPosition,
  fromSignatureHelpContext,
  toSignatureHelp,
} from 'monaco-languageserver-types';
import {
  SignatureHelpOptions,
  SignatureHelpParams,
  SignatureHelpRequest,
  type ProtocolConnection,
} from 'vscode-languageserver-protocol/browser';

export default function registerSignatureHelpProvider(
  connection: ProtocolConnection,
  options: SignatureHelpOptions,
) {
  monaco.languages.registerSignatureHelpProvider('python', {
    async provideSignatureHelp(model, position, _token, context) {
      const result = await connection.sendRequest(SignatureHelpRequest.type, {
        textDocument: {
          uri: model.uri.toString(),
        },

        position: fromPosition(position),
        context: fromSignatureHelpContext(context),
      } satisfies SignatureHelpParams);
      if (!result) {
        console.warn('no signature help data available');
        return;
      }

      return { value: toSignatureHelp(result), dispose: () => {} };
    },

    signatureHelpTriggerCharacters: options.triggerCharacters,
    signatureHelpRetriggerCharacters: options.retriggerCharacters,
  });
}
