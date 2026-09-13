const net = require("net");
const Modbus = require("jsmodbus");

const HOST = "127.0.0.1";
const PORT = 15002;

const socket = new net.Socket();
const client = new Modbus.client.TCP(socket, 1);

socket.connect(PORT, HOST, async () => {
  console.log("Connected to simulator");

  setInterval(async () => {
    try {
      const response = await client.readHoldingRegisters(0, 1);

      const value = response.response.body.valuesAsArray[0];
      const frequency = value / 100;

      console.log(`Frequency: ${frequency.toFixed(2)} Hz`);
    } catch (err) {
      console.error("Read error:", err.message);
    }
  }, 1000);
});
