const net = require("net");
const Modbus = require("jsmodbus");
const createFrequencyGenerator = require("./frequency");
const config = require("./config");

const HOST = config.host;
function createTransducer(transducer) {
  const { id, port, mode, updateIntervalMs } = transducer;
  const netServer = new net.Server();
  if (mode === "disconnect") {
    // console.log(`Transducer ${id} is DISCONNECTED`);
    return;
  }

  const holding = Buffer.alloc(10 * 2);

  const frequencyGenerator = createFrequencyGenerator({
    ...config.frequency,
    mode,
  });

  function updateFrequency() {
    const frequency = frequencyGenerator.update();

    const registerValue = Math.round(frequency * config.frequency.scale);

    holding.writeUInt16BE(registerValue, 0);

    // console.log(`T${String(id).padStart(2, "0")} | ${frequency.toFixed(2)} Hz`);
  }

updateFrequency();

setInterval(updateFrequency, updateIntervalMs);
  new Modbus.server.TCP(netServer, {
    holding,
    unitId: id,
  });

netServer.listen(port, HOST, () => {
  // console.log(
    // `Transducer ${id} listening on ${HOST}:${port} | interval: ${updateIntervalMs} ms`
  // );
});

netServer.on("error", (err) => {
  // console.log(
  //   `Transducer ${id} listening on ${HOST}:${port} | interval: ${updateIntervalMs} ms`
  // );
});

  netServer.on("error", (err) => {
    console.error(`Transducer ${id} error:`, err.message);
  });
}

for (const transducer of config.transducers) {
  createTransducer(transducer);
}