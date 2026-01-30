export function generatePairingAgentScript(): string {
  return `#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');

const PORT = 18790;
const PAIRING_SECRET = process.env.POCKETMOLT_PAIRING_SECRET || '';

function log(msg) {
  console.log(\`[\${new Date().toISOString()}] \${msg}\`);
}

function computeAcceptKey(key) {
  return crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
}

function parseFrame(buffer) {
  if (buffer.length < 2) return null;
  const secondByte = buffer[1];
  const masked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7F;
  let offset = 2;
  
  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  
  if (masked) {
    if (buffer.length < offset + 4 + payloadLength) return null;
    const mask = buffer.slice(offset, offset + 4);
    const payload = buffer.slice(offset + 4, offset + 4 + payloadLength);
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= mask[i % 4];
    }
    return payload.toString('utf8');
  }
  
  if (buffer.length < offset + payloadLength) return null;
  return buffer.slice(offset, offset + payloadLength).toString('utf8');
}

function createFrame(data) {
  const payload = Buffer.from(data);
  const length = payload.length;
  let header;
  
  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  
  return Buffer.concat([header, payload]);
}

function sendWs(socket, type, data) {
  const msg = JSON.stringify({ type, ...data });
  socket.write(createFrame(msg));
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('PocketMolt Pairing Agent');
});

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  const secret = req.headers['x-pocketmolt-secret'];
  
  if (PAIRING_SECRET && secret !== PAIRING_SECRET) {
    log('Unauthorized connection attempt');
    socket.destroy();
    return;
  }
  
  if (!key) {
    socket.destroy();
    return;
  }
  
  const acceptKey = computeAcceptKey(key);
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    \`Sec-WebSocket-Accept: \${acceptKey}\`,
    '',
    ''
  ].join('\\r\\n'));
  
  log('WebSocket connection established, starting pairing...');
  sendWs(socket, 'status', { message: 'Checking WhatsApp connection status...' });
  
  const env = { ...process.env, CLAWDBOT_CONFIG_PATH: '/root/.clawdbot/moltbot.json' };
  
  const checkStatus = spawn('clawdbot', ['channels', 'list'], { env });
  let statusOutput = '';
  
  checkStatus.stdout.on('data', (data) => {
    statusOutput += data.toString();
  });
  
  checkStatus.on('close', (checkCode) => {
    log(\`channels list exited with code \${checkCode}: \${statusOutput.substring(0, 200)}\`);
    
    if (statusOutput.toLowerCase().includes('whatsapp') && statusOutput.toLowerCase().includes('linked')) {
      log('WhatsApp already paired, notifying client');
      sendWs(socket, 'paired', { success: true, alreadyPaired: true });
      socket.end();
      return;
    }
    
    sendWs(socket, 'status', { message: 'Configuring WhatsApp channel...' });
  
    const addChannel = spawn('clawdbot', ['channels', 'add', '--channel', 'whatsapp'], { env });
  
    addChannel.on('close', (addCode) => {
    log(\`channels add exited with code \${addCode}\`);
    
    if (addCode !== 0) {
      log('Failed to add WhatsApp channel, trying login anyway...');
    }
    
    sendWs(socket, 'status', { message: 'Starting WhatsApp pairing...' });
    
    // Now run the login command
    const child = spawn('clawdbot', ['channels', 'login', '--channel', 'whatsapp', '--verbose'], { env });
  
    let qrBuffer = '';
  
    child.stdout.on('data', (data) => {
      const text = data.toString();
      log(\`stdout: \${text.substring(0, 100)}...\`);
      
      // Check for pairing success
      if (text.toLowerCase().includes('paired') || text.toLowerCase().includes('connected') || text.toLowerCase().includes('logged in')) {
        sendWs(socket, 'paired', { success: true });
        child.kill();
        return;
      }
      
      // Start of new QR code - reset buffer
      if (text.includes('Scan this QR')) {
        qrBuffer = '';
        return;
      }
      
      // Accumulate QR code lines (block characters)
      if (text.includes('█') || text.includes('▀') || text.includes('▄')) {
        qrBuffer += text;
        // Check if we have a complete QR code (ends with full block row)
        if (qrBuffer.includes('█▄▄▄▄▄▄▄█') || qrBuffer.split('\\n').length > 25) {
          // Send the ASCII QR code to frontend
          sendWs(socket, 'qr', { code: qrBuffer.trim() });
          log('Sent QR code to client');
        }
        return;
      }
      
      // Check for errors
      if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
        sendWs(socket, 'error', { message: text.trim() });
      }
    });
  
    child.stderr.on('data', (data) => {
      const text = data.toString();
      log(\`stderr: \${text}\`);
      sendWs(socket, 'log', { message: text.trim() });
    });
  
    child.on('close', (code) => {
      log(\`Pairing process exited with code \${code}\`);
      if (code === 0) {
        sendWs(socket, 'complete', { success: true });
      } else {
        sendWs(socket, 'error', { message: \`Process exited with code \${code}\` });
      }
      socket.end();
    });
  
    socket.on('data', (buffer) => {
      const msg = parseFrame(buffer);
      if (msg) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.type === 'cancel') {
            log('Pairing cancelled by client');
            child.kill();
          }
        } catch (e) {}
      }
    });
  
    socket.on('close', () => {
      log('Client disconnected');
      child.kill();
    });
  
    socket.on('error', (err) => {
      log(\`Socket error: \${err.message}\`);
      child.kill();
    });
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  log(\`Pairing agent listening on port \${PORT}\`);
});
`
}
