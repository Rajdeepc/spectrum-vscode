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

// dynamic representation of token values
function constructValue(valueObj) {
  if (valueObj.sets) {
    const sets = [];

    for (const setName in valueObj.sets) {
      if (valueObj.sets.hasOwnProperty(setName)) {
        const set = valueObj.sets[setName];
        sets.push(`${setName}: ${constructValue(set)}`);
      }
    }

    return sets.join(', ');
  } else {
    return valueObj.value || '';
  }
}

Object.keys(DesignTokens).forEach((key) => {
  const token = `--spectrum-${key}`;
  const note = `${DesignTokens[key]?.value}`;
  const valueObj = DesignTokens[key];
  const value = constructValue(valueObj);

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
      detail: tokens[token].value,
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
    contents: `${tokens[result].value}`,
  };
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
