import {
  createProtocolConnection,
  BrowserMessageWriter,
  AbstractMessageReader,
  MessageReader,
  DataCallback,
  Disposable,
  Message,
  Emitter,
  Event,
  InitializeRequest,
  InitializeParams,
  LogMessageNotification,
  MessageType,
  NotificationType,
  DidChangeConfigurationParams,
  InitializedNotification,
} from 'vscode-languageserver-protocol/browser';

import workerUrl from 'browser-basedpyright/dist/pyright.worker.js?url';
import { getCompletionCapabilities } from '../glue/completion';

class BrowserMessageReader extends AbstractMessageReader implements MessageReader {
  private _worker: Worker;
  private _unknownMessageEmitter: Emitter<unknown>;

  public onUnknownMessage: Event<unknown>;

  constructor(worker: Worker) {
    super();
    this._worker = worker;
    this._unknownMessageEmitter = new Emitter();
    this.onUnknownMessage = this._unknownMessageEmitter.event;

    this._worker.addEventListener('error', (e) => this.fireError(e));
    // this._worker.addEventListener('message', (e) => console.log(e.data));
  }
  listen(callback: DataCallback): Disposable {
    const listener = (e: MessageEvent<unknown>) => {
      if (
        typeof e.data === 'object' &&
        e.data &&
        'jsonrpc' in e.data &&
        typeof e.data.jsonrpc === 'string'
      ) {
        callback(e.data as Message);
      } else {
        this._unknownMessageEmitter.fire(e.data);
      }
    };

    this._worker.addEventListener('message', listener);

    return Disposable.create(() => {
      this._worker.removeEventListener('message', listener);
    });
  }
}

const foregroundWorker = new Worker(workerUrl, {
  name: 'basedpyright-worker-foreground',
  type: 'classic',
});

const reader = new BrowserMessageReader(foregroundWorker);

// Background workers
const workers: Worker[] = [foregroundWorker];
let backgroundWorkerCount = 0;

reader.onUnknownMessage((msg) => {
  console.warn('Non-lsp message received:', msg);

  if (msg && typeof msg === 'object' && 'type' in msg && msg.type === 'browser/newWorker') {
    // Create a new background worker.
    // The foreground worker has created a message channel and passed us
    // a port. We create the background worker and pass transfer the port
    // onward.
    const { initialData, port } = msg as {
      type: string;
      port: MessagePort;
      initialData: any;
    };
    const background = new Worker(workerUrl, {
      name: `Pyright-background-${++backgroundWorkerCount}`,
    });
    workers.push(background);
    background.postMessage(
      {
        type: 'browser/boot',
        mode: 'background',
        initialData,
        port,
      },
      [port],
    );
  }
});

const connection = createProtocolConnection(reader, new BrowserMessageWriter(foregroundWorker), {
  log: (message) => console.log(message),
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
});

connection.listen();

connection.onDispose(() => {
  workers.forEach((worker) => worker.terminate());
});

connection.onError(async ([error]) => {
  console.error(`Client connection to server is erroring.\n${error.message}`);
});

connection.onNotification(LogMessageNotification.type, (message) => {
  switch (message.type) {
    case MessageType.Error:
      console.error(message.message);
      break;
    case MessageType.Warning:
      console.warn(message.message);
      break;
    case MessageType.Info:
      console.info(message.message);
      break;
    case MessageType.Debug:
      console.debug(message.message);
      break;
    default:
      console.log(message.message);
  }
});

foregroundWorker.postMessage({
  type: 'browser/boot',
  mode: 'foreground',
});

const rootPath = '/playground/';

const { capabilities } = await connection.sendRequest(InitializeRequest.type, {
  processId: null,
  rootUri: 'file://' + rootPath,
  rootPath,
  capabilities: {
    textDocument: {
      publishDiagnostics: {
        relatedInformation: true,
        versionSupport: true,
        tagSupport: {
          valueSet: [1, 2],
        },
      },
      hover: {
        contentFormat: ['markdown', 'plaintext'],
      },

      completion: getCompletionCapabilities(),
    },
  },

  initializationOptions: {
    files: {
      [rootPath + 'pyrightconfig.json']: JSON.stringify({
        typeshedPath: '/typeshed',
      }),
    },
  },
} satisfies InitializeParams);

await connection.sendNotification(InitializedNotification.type, {});

await connection.sendNotification(
  new NotificationType<DidChangeConfigurationParams>('workspace/didChangeConfiguration'),
  {
    settings: {},
  },
);

console.log('Capabilities:', capabilities);

export default connection;
export { capabilities };
