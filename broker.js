const aedes = require('aedes')();
const net = require('net');
const ws = require('websocket-stream');
const http = require('http');
const axios = require('axios'); // Make sure to install axios via npm

const TCP_PORT = 1883;
const WS_PORT = 8883;

// Start TCP MQTT server
const netServer = net.createServer(aedes.handle);
netServer.listen(TCP_PORT, () => {
  console.log(`MQTT server listening on TCP port ${TCP_PORT}`);
}).on('error', (error) => {
  console.error('Error in TCP Server:', error);
});

// Setup WebSocket server
const httpServer = http.createServer();
ws.createServer({ server: httpServer }, aedes.handle);
httpServer.listen(WS_PORT, () => {
  console.log(`WebSocket server listening on port ${WS_PORT}`);
}).on('error', (error) => {
  console.error('Error in WebSocket Server:', error);
});

// Handle client connections
aedes.on('client', (client) => {
  console.log(`Client connected: ${client.id}`);
});

// Handle client disconnections
aedes.on('clientDisconnect', (client) => {
  console.log(`Client disconnected: ${client.id}`);
});

// Handling publish events, specifically for incoming requests
aedes.on('publish', async (packet, client) => {
  if (!client) return; // Ignore messages published by the broker itself

  console.log(`Received message from ${client.id}: topic ${packet.topic}, payload ${packet.payload.toString()}`);

  const payloadData = packet.payload.toString().split(",");
  const pointId = payloadData[0];
  const token = payloadData[1];
  const siteId = payloadData[2];

  // Fetch current prices based on the siteId and token extracted from payload
  const priceData = await fetchCurrentPrices(siteId, token);
  const responsePayload = JSON.stringify({ pointId: "price", value:priceData[0].perKwh });

 // console.log(priceData)
  // Publish the fetched prices to a topic
  aedes.publish({ topic: "response/prices", payload: responsePayload });
});

// General error handling
aedes.on('error', (error) => {
  console.error('Aedes error:', error);
});

// Function to fetch current prices using the API with axios
async function fetchCurrentPrices(siteId, token) {
  const url = `https://api.amber.com.au/v1/sites/${siteId.replace('}', '')}/prices/current`;
  try {
    const response = await axios.get(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data; // Assuming the API returns data directly
  } catch (error) {
    console.error('Axios fetch error:', error);
    return null; // Return null to indicate the failure
  }
}
