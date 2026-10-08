import { buildTestReceipt, writeInChunks } from './receipt.js';

const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb';
const $ = (id) => document.getElementById(id);
const connectButton = $('connect');
const printButton = $('print');
const disconnectButton = $('disconnect');
const baudRate = $('baud-rate');

let port = null;
let writer = null;
let connecting = false;
let printing = false;
let disconnectRequested = false;
let activePrint = null;
let closePromise = null;

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  $('log').textContent += `[${timestamp}] ${message}\n`;
  $('log').scrollTop = $('log').scrollHeight;
}

function describeError(error) {
  if (error instanceof Error || error instanceof DOMException) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }
  return String(error);
}

function logError(action, error) {
  log(`${action}: ${describeError(error)}`);
}

function setStatus(message, state = '') {
  $('connection-status').textContent = message;
  $('status-dot').className = `status-dot ${state}`.trim();
}

const supported = location.protocol === 'https:' && isSecureContext &&
  typeof navigator.serial?.requestPort === 'function';

function updateButtons() {
  connectButton.disabled = !supported || connecting || !!port || !!closePromise;
  printButton.disabled = !port || printing || !!closePromise || disconnectRequested;
  disconnectButton.disabled = !port || !!closePromise;
  baudRate.disabled = connecting || !!port || !!closePromise;
}

function showSupport() {
  const https = location.protocol === 'https:' && isSecureContext;
  $('https-check').textContent = https ? 'Ready' : 'HTTPS required';
  $('https-check').className = https ? 'good' : 'bad';
  const api = typeof navigator.serial?.requestPort === 'function';
  $('api-check').textContent = api ? 'Available' : 'Unavailable';
  $('api-check').className = api ? 'good' : 'bad';
  $('support-message').textContent = !https
    ? 'Open the published HTTPS link before connecting.'
    : !api
      ? 'This browser does not expose Web Serial. Use Chrome 138 or newer on Android; iPhone Safari and Android WebView/APK are not supported here.'
      : 'Browser checks passed. Pair and select the printer to test its SPP connection.';
  $('support-message').className = `support-message ${supported ? 'good' : 'bad'}`;
  updateButtons();
  log(`HTTPS: ${https ? 'yes' : 'no'}; Web Serial: ${api ? 'available' : 'unavailable'}.`);
}

async function closeConnection(reason) {
  if (closePromise) return closePromise;
  closePromise = (async () => {
    disconnectRequested = true;
    setStatus('Disconnecting…');
    updateButtons();
    if (writer) {
      try { await writer.abort(new Error('Disconnect requested')); }
      catch (error) { logError('Stop pending write', error); }
    }
    if (activePrint) {
      try { await activePrint; }
      catch { /* The print handler records the full error. */ }
    }
    if (port) {
      try { await port.close(); }
      catch (error) { logError('Close port', error); }
    }
    port = null;
    writer = null;
    setStatus('Not connected');
    log(reason);
    disconnectRequested = false;
  })();
  try { await closePromise; }
  finally { closePromise = null; updateButtons(); }
}

async function connect() {
  if (!supported || connecting || port) return;
  connecting = true;
  setStatus('Selecting printer…');
  updateButtons();
  let selectedPort;
  try {
    selectedPort = await navigator.serial.requestPort({
      filters: [{ bluetoothServiceClassId: SPP_UUID }],
    });
    log(`Device selected. Service: ${selectedPort.getInfo?.().bluetoothServiceClassId ?? 'not reported'}.`);
    const selectedBaud = Number(baudRate.value);
    setStatus('Connecting…');
    await selectedPort.open({ baudRate: selectedBaud });
    port = selectedPort;
    disconnectRequested = false;
    setStatus(`Connected at ${selectedBaud} baud`, 'connected');
    log(`Port opened at ${selectedBaud} baud.`);
  } catch (error) {
    setStatus('Connection failed', 'error');
    logError('Connect failed', error);
  } finally {
    connecting = false;
    updateButtons();
  }
}

async function performPrint() {
  const bytes = buildTestReceipt();
  writer = port.writable.getWriter();
  try {
    await writeInChunks(writer, bytes, () => disconnectRequested || !port);
    log(`Sent ${bytes.length} bytes in 32 byte chunks. Check the physical receipt.`);
    setStatus('Data sent; check printer', 'connected');
  } finally {
    writer.releaseLock();
    writer = null;
  }
}

async function printTest() {
  if (!port || printing || closePromise) return;
  printing = true;
  setStatus('Sending test receipt…', 'connected');
  updateButtons();
  let failed = false;
  activePrint = performPrint();
  try { await activePrint; }
  catch (error) {
    failed = true;
    logError('Print failed', error);
    setStatus('Print failed', 'error');
  } finally {
    activePrint = null;
    printing = false;
    updateButtons();
  }
  if (failed && !closePromise) await closeConnection('Connection closed after print error.');
}

connectButton.addEventListener('click', connect);
printButton.addEventListener('click', printTest);
disconnectButton.addEventListener('click', () => { void closeConnection('Disconnected by user.'); });
$('clear-log').addEventListener('click', () => { $('log').textContent = ''; });
if (navigator.serial?.addEventListener) {
  navigator.serial.addEventListener('disconnect', (event) => {
    if (event.target === port) void closeConnection('Bluetooth device disconnected.');
  });
}
showSupport();
