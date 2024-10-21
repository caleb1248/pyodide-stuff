import { expose } from 'synclink';
import { readLine, writeToStdout, keyboardInterruptBuffer } from './terminal';
import './style.css';
import './editor/editor';
import WorkerConstructor from './worker/worker?worker';

const worker = new WorkerConstructor({ name: 'pyodide-worker' });

worker.addEventListener(
  'message',
  (e: MessageEvent<MessagePort>) => {
    worker.postMessage({ interruptBuffer: keyboardInterruptBuffer });
    worker.addEventListener('message', (e) => {
      if (Array.isArray(e.data)) {
        console.log(...e.data);
      } else {
        console.log(e.data);
      }
    });

    const port = e.data;

    expose(
      {
        write(data: Uint8Array) {
          writeToStdout(data);
        },

        readLine,

        getInterruptBuffer() {
          return keyboardInterruptBuffer;
        },
      },
      port,
    );
  },
  { once: true },
);
