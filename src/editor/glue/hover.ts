import * as monaco from 'monaco-editor';
import { fromPosition, toHover } from 'monaco-languageserver-types';
import {
  HoverParams,
  HoverRequest,
  type ProtocolConnection,
} from 'vscode-languageserver-protocol/browser';

export default function registerHoverProvider(connection: ProtocolConnection) {
  monaco.languages.registerHoverProvider('python', {
    async provideHover(model, position) {
      const result = await connection.sendRequest(HoverRequest.type, {
        textDocument: {
          uri: model.uri.toString(),
        },
        position: fromPosition(position),
      } satisfies HoverParams);
      if (!result) {
        console.warn('no hover data available');
        return;
      }

      return toHover(result);
    },
  });
}
