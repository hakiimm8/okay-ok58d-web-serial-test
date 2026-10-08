# OKAY OK-58D Bluetooth printer test

A standalone, static GitHub Pages diagnostic page for a paired Bluetooth Classic SPP/RFCOMM 58 mm receipt printer. It uses the [Web Serial API](https://developer.chrome.com/blog/serial-over-bluetooth/), not Web Bluetooth BLE. Chrome 138 [introduced Web Serial over Bluetooth on Android](https://developer.chrome.com/release-notes/138).

## Try it on a phone

1. Pair the powered-on printer in Android Bluetooth settings. Keep it nearby and loaded with paper.
2. Open the published HTTPS page in Chrome for Android 138 or newer. Check that the page reports HTTPS and Web Serial available.
3. Leave the baud rate at 9600 first. Tap **Connect printer**, then select the paired printer in Chrome's picker.
4. Tap **Print test**. Look for a readable receipt with centered, left, and right-aligned text.
5. If the connection fails or text is garbled, disconnect and retry another baud rate. Save the complete diagnostic log when reporting the result.

The picker filters for standard SPP service UUID `00001101-0000-1000-8000-00805f9b34fb`. A printer with a different service may not appear. Pairing, an available API, and even a successful port open do not establish compatibility. **Only a physical print confirms that this particular OK-58D accepts these ESC/POS commands over SPP.**

The receipt uses ESC/POS initialization and alignment plus ASCII text and paper feed. It sends no cutter or cash drawer commands. Printing uses 32 byte writes and stops on disconnect.

Android WebView/APK and iPhone Safari are not supported by this browser test. No backend, account, or data collection is included.

## Local checks

Run `node --test receipt.test.mjs`. Opening `index.html` as a `file:` URL cannot use Web Serial; the published HTTPS link is required for browser testing.
