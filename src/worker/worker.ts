/// <reference lib="WebWorker" />

import { loadPyodide } from 'pyodide';
import { wrap } from 'synclink';
declare var self: DedicatedWorkerGlobalScope;

const channel = new MessageChannel();
self.postMessage(channel.port2, [channel.port2]);
console.log = (...args) => self.postMessage(args);
console.info = console.log;
addEventListener('error', (e) => self.postMessage(e.error));

const pyodide = await loadPyodide({
  indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
});
console.log('Yes Sir!');
setTimeout(() => {
  const api = wrap<{ write(data: string): void }>(channel.port1);
  pyodide.setStdin({
    stdin() {
      return '1\\n';
    },
  });
  console.log('init pyodide');
  pyodide.setStdout({
    batched(output) {
      api.write(output).syncify();
    },
  });

  pyodide.runPython(`
print('hello, world!')
x=input('hi')
`);
  console.log('init pyodide');
}, 1000);
