const encoder = new TextEncoder();

export function buildTestReceipt() {
  const data = [];
  const command = (...bytes) => data.push(...bytes);
  const line = (text = '') => data.push(...encoder.encode(`${text}\n`));

  command(0x1b, 0x40); // Initialize ESC/POS.
  command(0x1b, 0x61, 0x01);
  line('OK-58D PRINT TEST');
  line('Center aligned');
  command(0x1b, 0x61, 0x00);
  line('--------------------------------');
  line('Left aligned');
  line('Coffee                 1 x 12.00');
  line('Tea                     2 x 5.00');
  line('Cookie                  1 x 3.00');
  line('--------------------------------');
  command(0x1b, 0x61, 0x02);
  line('Right aligned');
  command(0x1b, 0x61, 0x00);
  line('TOTAL                      25.00');
  line('--------------------------------');
  line('ASCII / ESC-POS / 32 columns');
  line('If readable, SPP print works.');
  line();
  line();
  line();
  return Uint8Array.from(data);
}

export async function writeInChunks(writer, data, shouldStop) {
  for (let offset = 0; offset < data.length; offset += 32) {
    if (shouldStop()) throw new Error('Printer disconnected; print cancelled.');
    await writer.write(data.slice(offset, offset + 32));
  }
}
