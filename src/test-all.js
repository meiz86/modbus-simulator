const net = require("net");
const Modbus = require("jsmodbus");

const HOST = "127.0.0.1";

function readTransducer(id, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, 1);

    socket.setTimeout(2000);

    socket.connect(port, HOST, async () => {
      try {
        const response = await client.readHoldingRegisters(0, 1);

        const value = response.response.body.valuesAsArray[0];
        const frequency = value / 100;

        // console.log(`Transducer ${id}: ${frequency.toFixed(2)} Hz`);

        socket.destroy();
        resolve();
      } catch (err) {
        console.error(`Transducer ${id}: ERROR - ${err.message}`);

        socket.destroy();
        resolve();
      }
    });

    socket.on("timeout", () => {
      console.error(`Transducer ${id}: TIMEOUT`);
      socket.destroy();
      resolve();
    });

    socket.on("error", (err) => {
      console.error(`Transducer ${id}: ERROR - ${err.message}`);

      resolve();
    });
  });
}

async function testAll() {
  for (let id = 1; id <= 10; id++) {
    await readTransducer(id, 15000 + id);
  }
}

testAll();
