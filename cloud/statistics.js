let statistics = {};

/**
 * Initializes the statistics object with a new object.
 * @param {object} initialData The object to set as the statistics.
 */
function initialize(config) {
  if (config) {
    statistics = {avgDistance: config.get("avgDistance"), maxDistance: config.get("maxDistance")};
  } else {
    console.error('Invalid input: initialize() expects an object.');
  }
}

/**
 * Merges new data into the existing statistics object.
 * @param {object} newData The object with data to add to the statistics.
 */
async function complement(newData) {
  if (newData) {
    statistics.avgDistance = (statistics.avgDistance + newData.bestDistance) / 2,
    statistics.maxDistance = statistics.maxDistance < newData.bestDistance ? newData.bestDistance : statistics.maxDistance
    Parse.Config.save(statistics, {useMasterKey: true}).catch(err => {
        console.error("Error al actualizar la configuración:", err);
    });
  } else {
    console.error('Invalid input: complement() expects an object.');
  }
}

/**
 * Returns the current statistics object.
 * @returns {object} The current statistics.
 */
function getStatistics() {
  return statistics;
}

module.exports = {
  initialize,
  complement,
  getStatistics,
};