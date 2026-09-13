const net = require("net");
const Modbus = require("jsmodbus");
const config = require("./config");
const handleMeasurement = require("./measurement-handler");

function startTransducer(transducer) {
  const socket = new net.Socket();
  const client = new Modbus.client.TCP(socket, transducer.id);

  let reconnectScheduled = false;

  socket.setTimeout(2000);

  socket.connect(transducer.port, config.host, () => {
    reconnectScheduled = false;

    console.log(`T${String(transducer.id).padStart(2, "0")} | CONNECTED`);

    readLoop();
  });

  async function readLoop() {
    if (socket.destroyed) {
      return;
    }

    try {
      const response = await client.readHoldingRegisters(0, 1);

      const rawValue = response.response.body.valuesAsArray[0];

      const frequency = rawValue / config.frequency.scale;

      const measurement = {
        transducerId: transducer.id,
        timestamp: new Date(),
        rawValue,
        frequency,
      };

      handleMeasurement(measurement);
    } catch (err) {
      console.error(
        `T${String(transducer.id).padStart(2, "0")} | READ ERROR | ${err.message}`,
      );
    }

    if (!socket.destroyed) {
      setTimeout(readLoop, transducer.updateIntervalMs);
    }
  }

  socket.on("timeout", () => {
    console.error(`T${String(transducer.id).padStart(2, "0")} | TIMEOUT`);

    socket.destroy();
  });

  socket.on("error", (err) => {
    console.error(
      `T${String(transducer.id).padStart(2, "0")} | CONNECTION ERROR | ${err.message}`,
    );
  });

  socket.on("close", () => {
    console.log(`T${String(transducer.id).padStart(2, "0")} | DISCONNECTED`);

    if (reconnectScheduled) {
      return;
    }

    reconnectScheduled = true;

    setTimeout(() => {
      console.log(`T${String(transducer.id).padStart(2, "0")} | RECONNECTING`);

      startTransducer(transducer);
    }, 2000);
  });
}

for (const transducer of config.transducers) {
  startTransducer(transducer);
}
