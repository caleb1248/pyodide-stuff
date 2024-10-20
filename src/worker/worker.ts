/// <reference lib="WebWorker" />

import { loadPyodide } from 'pyodide';
import { wrap } from 'synclink';
declare var self: DedicatedWorkerGlobalScope;

const channel = new MessageChannel();

self.postMessage(channel.port2, [channel.port2]);
const interruptBuffer = await new Promise<Uint8Array>((resolve) => {
  self.addEventListener('message', (e) => {
    if (typeof e.data === 'object' && e.data != null && e.data.interruptBuffer) {
      resolve(e.data.interruptBuffer);
    }
  });
});

console.log = (...args) => self.postMessage(args);
console.info = console.log;
addEventListener('error', (e) => self.postMessage(e.error));

const pyodide = await loadPyodide({
  indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
});

const api = wrap<{
  write(data: Uint8Array): void;
  readLine: () => string;
  getInterruptBuffer(): Uint8Array;
}>(channel.port1);

pyodide.setStdin({
  stdin() {
    return api.readLine().syncify();
  },
});

pyodide.setStdout({
  write(buffer) {
    api.write(buffer).syncify();
    return buffer.length;
  },
});

pyodide.setStderr({
  write(buffer) {
    console.log('length', buffer.length);
    api.write(buffer).syncify();
    return buffer.length;
  },
});

pyodide.setInterruptBuffer(interruptBuffer);
console.log('init pyodide');

setTimeout(() => {
  pyodide
    .runPythonAsync(
      `
print('Hello, world!')
x=input('What is your name? ')
print('Hi ' + x + '!')
`,
    )
    .catch((e) => {
      api.write(new TextEncoder().encode('\x1b[0;31m' + e.message + '\x1b[0m')).syncify();
    });
  setTimeout(() => console.log(interruptBuffer[0]), 1000);
}, 1000);
