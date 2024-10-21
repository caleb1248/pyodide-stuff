import {
  CompletionClientCapabilities,
  CompletionOptions,
  CompletionParams,
  CompletionRequest,
  CompletionResolveRequest,
  ProtocolConnection,
  CompletionItemKind,
} from 'vscode-languageserver-protocol';
import * as monaco from 'monaco-editor';
import {
  fromCompletionContext,
  fromCompletionItem,
  fromPosition,
  toCompletionItem,
  toCompletionList,
} from 'monaco-languageserver-types';

export function registerCompletionProvider(
  connection: ProtocolConnection,
  completionCapabilities: CompletionOptions,
) {
  if (!connection) return;

  const provider: monaco.languages.CompletionItemProvider = {
    async provideCompletionItems(model, position, context) {
      console.log('completion requested');
      const response = await connection.sendRequest(CompletionRequest.type, {
        context: fromCompletionContext(context),
        position: fromPosition(position),
        textDocument: {
          uri: model.uri.toString(),
        },
      } satisfies CompletionParams);

      if (!response) return null;

      const { startColumn, endColumn } = model.getWordUntilPosition(position);
      let result: monaco.languages.CompletionList;

      if (Array.isArray(response)) {
        result = {
          suggestions: response.map((item) =>
            toCompletionItem(item, {
              range: {
                startLineNumber: position.lineNumber,
                startColumn,
                endLineNumber: position.lineNumber,
                endColumn,
              },
            }),
          ),
        };
      } else {
        result = toCompletionList(response, {
          range: {
            startLineNumber: position.lineNumber,
            startColumn,
            endLineNumber: position.lineNumber,
            endColumn,
          },
        });
      }

      return result;
    },
  };

  if (completionCapabilities.triggerCharacters) {
    provider.triggerCharacters = completionCapabilities.triggerCharacters;
  }

  if (completionCapabilities.resolveProvider) {
    provider.resolveCompletionItem = async (item) => {
      const result = await connection.sendRequest(
        CompletionResolveRequest.type,
        fromCompletionItem(item),
      );

      return toCompletionItem(result, { range: item.range });
    };
  }

  monaco.languages.registerCompletionItemProvider('python', provider);
}

export function getCompletionCapabilities(): CompletionClientCapabilities {
  const supportedKinds = [
    CompletionItemKind.Text,
    CompletionItemKind.Method,
    CompletionItemKind.Function,
    CompletionItemKind.Constructor,
    CompletionItemKind.Field,
    CompletionItemKind.Variable,
    CompletionItemKind.Class,
    CompletionItemKind.Interface,
    CompletionItemKind.Module,
    CompletionItemKind.Property,
    CompletionItemKind.Unit,
    CompletionItemKind.Value,
    CompletionItemKind.Enum,
    CompletionItemKind.Keyword,
    CompletionItemKind.Snippet,
    CompletionItemKind.Color,
    CompletionItemKind.File,
    CompletionItemKind.Reference,
    CompletionItemKind.Folder,
    CompletionItemKind.EnumMember,
    CompletionItemKind.Constant,
    CompletionItemKind.Struct,
    CompletionItemKind.Event,
    CompletionItemKind.Operator,
    CompletionItemKind.TypeParameter,
  ];

  return {
    contextSupport: true,
    completionItem: {
      snippetSupport: true,
      commitCharactersSupport: true,
      documentationFormat: ['plaintext', 'markdown'],
      deprecatedSupport: true,
      preselectSupport: true,
      labelDetailsSupport: true,
    },
    completionItemKind: {
      valueSet: supportedKinds,
    },
  };
}
