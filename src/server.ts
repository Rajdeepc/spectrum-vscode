import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  Hover,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as DesignTokens from './tokens.js';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize(() => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        triggerCharacters: ['--'],
      },
      // Tell the client that this server supports hover.
      hoverProvider: true,
    },
  };
  return result;
});

const tokens: { [key: string]: { value: string; note: string | undefined } } = {};

Object.keys(DesignTokens).forEach((key) => {
  const token = `--spectrum-${key}`;
  const note = `${DesignTokens[key]?.value}`;
  const value = DesignTokens[key].sets ? `light: ${DesignTokens[key]?.sets?.light?.value} , dark: ${DesignTokens[key]?.sets?.dark?.value}, darkest: ${DesignTokens[key]?.sets?.darkest?.value}` : `${DesignTokens[key]?.value}`;
  tokens[token] = { value, note };
});

// This handler provides the list of the token completion items.
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
  const doc = documents.get(textDocumentPosition.textDocument.uri);

  // if the doc can't be found, return nothing
  if (!doc) {
    return [];
  }


  const allCompletionItems: CompletionItem[] = [];

  Object.keys(tokens).map((token) => {
    allCompletionItems.push({
      label: token,
      detail: `${tokens[token].value}${tokens[token].note ? ` (${tokens[token].note})` : ''}`,
      insertText: `var(${token})`,
      kind: CompletionItemKind.Value,
    });
  });

  return allCompletionItems;
});

// This handler provides the hover information for the token.
connection.onHover((textDocumentPosition: TextDocumentPositionParams): Hover => {
  const doc = documents.get(textDocumentPosition.textDocument.uri);

  // if the doc can't be found, return nothing
  if (!doc) {
    return { contents: [] };
  }

  const currentText = doc.getText({
    start: { line: textDocumentPosition.position.line, character: 0 },
    end: { line: textDocumentPosition.position.line, character: 1000 },
  });

  const result = Object.keys(tokens).find((token) => {
    const indexOfFirst = currentText.indexOf(token);
    return (
      indexOfFirst > -1 &&
      indexOfFirst <= textDocumentPosition.position.character &&
      indexOfFirst >= textDocumentPosition.position.character - token.length
    );
  });

  if (result === undefined) {
    return {
      contents: [],
    };
  }

  return {
    contents: `${result}: ${tokens[result].value}`,
  };
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
