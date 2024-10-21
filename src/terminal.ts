import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

import '@xterm/xterm/css/xterm.css';

// Create the terminal
const terminal = new Terminal({
  convertEol: true,
  letterSpacing: 0,
  fontFamily: 'JetBrains Mono, monospace',
});

terminal.open(document.getElementById('terminal')!);

const doNothing = () => {};

// Load the fit addon
const fitter = new FitAddon();
terminal.loadAddon(fitter);
window.addEventListener('resize', () => fitter.fit());
fitter.fit();

let prompt = '';
let currentInput = '';
let cursor = 0;
let inputEnabled = false;
let handleEnter: (data: string) => void = doNothing;

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
  if (!inputEnabled) return;

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

    case '\u0003':
      keyboardInterruptBuffer[0] = 2;
      terminal.write('\r\n');
      handleEnter(currentInput);
      break;

    case '\r':
      terminal.write(`\r\n`);
      handleEnter(currentInput);
      currentInput = '';
      prompt = '';
      cursor = 0;
      display();
      break;

    default:
      // Insert a character at the current cursor
      currentInput = currentInput.slice(0, cursor) + input + currentInput.slice(cursor);
      cursor++;
      display();
  }
}

export function readLine() {
  inputEnabled = true;
  return new Promise<string>((resolve) => {
    handleEnter = (data) => {
      handleEnter = doNothing;
      inputEnabled = false;
      console.log(keyboardInterruptBuffer[0]);
      resolve(data);
    };
  });
}

// // Paste support (Ctrl+Shift+V)
// terminal.onKey(({ key, domEvent: e }) => {
//   if (e.ctrlKey && e.shiftKey && key === 'v') {
//     navigator.clipboard.readText().then((value) => {
//       terminal.write(processInput(value));
//     });
//     return false;
//   }

//   return true;
// });

const newLine = '\n'.charCodeAt(0);
const decoder = new TextDecoder();

export function writeToStdout(data: Uint8Array) {
  terminal.write(data);
  const lastNewlineIndex = data.lastIndexOf(newLine);

  if (lastNewlineIndex !== -1) {
    if (lastNewlineIndex == data.length - 1) {
      prompt = '';
    } else {
      prompt = decoder.decode(data.slice(lastNewlineIndex + 1));
    }
  } else {
    prompt += decoder.decode(data);
  }
}

terminal.onData(handleInput);

export const keyboardInterruptBuffer = new Uint8Array(new SharedArrayBuffer(1));
