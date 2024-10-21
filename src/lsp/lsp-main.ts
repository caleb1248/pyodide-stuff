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
} from 'vscode-languageserver-protocol/browser';

import BasedPyrightWorker from 'browser-basedpyright/dist/pyright.worker.js?worker';

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
  }
  listen(callback: DataCallback): Disposable {
    console.log('listening...');
    const listener = (e: MessageEvent<unknown>) => {
      console.log('We have a message!');
      if (
        typeof e.data === 'object' &&
        e.data &&
        'jsonrpc' in e.data &&
        typeof e.data.jsonrpc === 'string'
      ) {
        callback(e.data as Message);
      } else {
        console.warn('unknown message');
        this._unknownMessageEmitter.fire(e.data);
      }
    };

    this._worker.addEventListener('message', listener);

    return Disposable.create(() => this._worker.removeEventListener('message', listener));
  }
}

const worker = new BasedPyrightWorker({ name: 'basedpyright-worker' });
const reader = new BrowserMessageReader(worker);
reader.onUnknownMessage(console.log);

reader.onError(console.log);

reader.listen(console.log);

const connection = createProtocolConnection(reader, new BrowserMessageWriter(worker), {
  log: (message) => console.log(message),
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
});
connection.listen();

connection.onError(async ([error]) => {
  console.error(`Client connection to server is erroring.\n${error.message}`);
});

connection
  .sendRequest(InitializeRequest.type, {
    processId: null,
    rootUri: 'file:///',
    capabilities: {},
  })
  .then(console.log, console.error);

console.log('Worker started!');
