import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

import '@xterm/xterm/css/xterm.css';

// Create the terminal
const terminal = new Terminal({
  convertEol: true,
});
terminal.open(document.getElementById('app')!);

// Load the fit addon
const fitter = new FitAddon();
terminal.loadAddon(fitter);
window.addEventListener('resize', () => fitter.fit());
console.log(JSON.stringify('\b'));

let prompt = '$ ';
let currentInput = '';
let cursor = 0;

terminal.write(prompt);

function display() {
  terminal.write(
    '\r\x1b[K' +
      prompt +
      currentInput +
      Array.from({ length: currentInput.length - cursor })
        .fill('\x1b[D')
        .join(''),
  );
}

function handleInput(input: string) {
  switch (input) {
    case '\x1b[A':
      // Cursor up a line
      break;
    case '\x1b[B':
    // Cursor down a line
    case '\x1b[C':
      // Move the cursor right
      if (cursor < currentInput.length) cursor++;
      display();
      break;
    case '\x1b[D':
      // Move the cursor left
      if (cursor > 0) cursor--;

      display();
      break;

    case '\x7f':
      // Backspace
      if (cursor > 0) {
        currentInput = currentInput.slice(0, cursor - 1) + currentInput.slice(cursor);
        cursor--;
        display();
      }
      break;

    case '\r':
      terminal.write(`\r\nYou entered: ${currentInput}\r\n`);
      currentInput = '';
      cursor = 0;
      display();
      break;
    default:
      console.log(JSON.stringify(input));
      // Insert a character at the current cursor
      currentInput = currentInput.slice(0, cursor) + input + currentInput.slice(cursor);
      cursor++;
      display();
  }
}

// terminal.onKey(({ key, domEvent: e }) => {
//   if (e.ctrlKey && key === 'v') {
//     navigator.clipboard.readText().then((value) => {
//       terminal.write(processInput(value));
//     });
//     return false;
//   }

//   return true;
// });

export function writeToStdout(data: string) {
  terminal.writeln(data);
}

terminal.onData(handleInput);
