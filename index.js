require('dotenv').config()
const express = require('express');
const ParseServer = require('parse-server').ParseServer;
const app = express();
const reverseCtrl = require('./cloud/reverseCtrl');

const { PORT, PARSE_MONGODB_URI, PARSE_APPID, PARSE_MASTERKEY, PARSE_SERVER_URL } = process.env;

const server = new ParseServer({
    databaseURI: PARSE_MONGODB_URI,
    cloud: './cloud/main.js',
    appId: PARSE_APPID,
    masterKey: PARSE_MASTERKEY,
    serverURL: PARSE_SERVER_URL
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/reverse', async (req, res) => {
    const {lat, lng} = req.query;
    const result = await reverseCtrl.reverse(parseFloat(lat), parseFloat(lng))
    return res.status(result.success?200:400).send(result)
})

const init = async () => {
    await server.start();
    app.use('/parse', server.app);
    app.listen(PORT || 1337, function () {
        console.log(`GeocodeCache running ${PORT || 1337}`);
    });
}

init();
