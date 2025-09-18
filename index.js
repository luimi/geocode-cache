require('dotenv').config()
const express = require('express');
const ParseServer = require('parse-server').ParseServer;
const app = express();
const reverseCtrl = require('./cloud/reverseCtrl');
const statistics = require('./cloud/statistics');
let config;

const { PORT, PARSE_MONGODB_URI, PARSE_APPID, PARSE_MASTERKEY, PARSE_SERVER_URL, PARSE_MASTERKEY_IP } = process.env;

const server = new ParseServer({
    databaseURI: PARSE_MONGODB_URI,
    cloud: './cloud/main.js',
    appId: PARSE_APPID,
    masterKey: PARSE_MASTERKEY,
    serverURL: PARSE_SERVER_URL,
    masterKeyIps: [PARSE_MASTERKEY_IP ? `${PARSE_MASTERKEY_IP}` : '0.0.0.0/0']
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/reverse', async (req, res) => {
    const {lat, lng} = req.query;
    if(!config) {
        config = await Parse.Config.get({ useMasterKey: true });
    }
    const result = await reverseCtrl.reverse(parseFloat(lat), parseFloat(lng), config)
    return res.status(result.success?200:400).send(result)
})

const init = async () => {
    await server.start();
    app.use('/parse', server.app);
    app.listen(PORT || 1337, async () => {
        console.log(`GeocodeCache running ${PORT || 1337}`);
        const config = await Parse.Config.get({ useMasterKey: true });
        statistics.initialize(config)
    });
}

init();
