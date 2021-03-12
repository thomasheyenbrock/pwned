const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

if (isMainThread) {
  module.exports = function filterNotes(notes, query) {
    const filterPromise = new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { notes, query },
      });
      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject("Timeout");
      }, 10000);
    });
    return Promise.race([filterPromise, timeoutPromise]);
  };
} else {
  const { notes, query } = workerData;
  const filteredNotes = query
    ? notes.filter((note) => note.note.match(query))
    : notes;
  parentPort.postMessage(filteredNotes);
}
