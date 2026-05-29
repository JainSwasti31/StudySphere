const axios = require('axios');
const io = require('socket.io-client');

const API = process.env.API_URL || 'http://localhost:5000';

const waitForEvent = (emitter, event, timeout = 5000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${event} timeout`)), timeout);
    emitter.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });

async function run() {
  try {
    const rand = Date.now();
    const u1 = { name: 'Alice' + rand, email: `alice${rand}@test.local`, password: 'Password123!' };
    const u2 = { name: 'Bob' + rand, email: `bob${rand}@test.local`, password: 'Password123!' };

    console.log('Registering users...');
    await axios.post(`${API}/api/auth/register`, u1).catch(() => {});
    await axios.post(`${API}/api/auth/register`, u2).catch(() => {});

    const login1 = await axios.post(`${API}/api/auth/login`, { email: u1.email, password: u1.password });
    const login2 = await axios.post(`${API}/api/auth/login`, { email: u2.email, password: u2.password });

    const token1 = login1.data.token;
    const token2 = login2.data.token;

    console.log('Creating room...');
    const createRes = await axios.post(`${API}/api/rooms`, { name: 'IntegrationRoom' }, { headers: { Authorization: `Bearer ${token1}` } });
    const room = createRes.data.room || createRes.data;
    const roomId = room.id || room._id || room._id;
    console.log('Room created:', roomId);

    const s1 = io(API, { auth: { token: token1 } });
    const s2 = io(API, { auth: { token: token2 } });

    await Promise.all([
      new Promise((res, rej) => s1.on('connect', res)) ,
      new Promise((res, rej) => s2.on('connect', res)),
    ]);

    console.log('Both sockets connected. Joining room...');
    s1.emit('join-room', { roomId });
    s2.emit('join-room', { roomId });

    // wait a moment for participants to propagate
    await new Promise((r) => setTimeout(r, 1000));

    console.log('Sending message from s1');

    const messagePromise = new Promise((resolve, reject) => {
      s2.on('message-received', (payload) => {
        console.log('s2 received message:', payload);
        resolve(payload);
      });
      setTimeout(() => reject(new Error('message timeout')), 5000);
    });

    s1.emit('send-message', { roomId, text: 'Hello from s1' });

    const received = await messagePromise;

    if (received && received.message && received.message.text === 'Hello from s1') {
      console.log('Integration test PASSED');
      s1.close();
      s2.close();
      process.exit(0);
    } else {
      throw new Error('unexpected message payload');
    }
  } catch (err) {
    console.error('Integration test FAILED:', err.message || err);
    process.exit(2);
  }
}

run();
