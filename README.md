# GeocodeCache

## Instalation

```bash
cd  geocode-cache
npm  i
```

## Configure

.env file

```enviroment
PORT=4000
PARSE_MONGODB_URI="mongodb+srv://user:password@main.abc123.mongodb.net/Main?retryWrites=true&w=majority&appName=Main"
PARSE_APPID="abcedfghijklmnopqrstuvwxyz"
PARSE_MASTERKEY="abcedfghijklmnopqrstuvwxyz"
PARSE_SERVER_URL="http://localhost:4000/parse"
```

## Run

```bash
npm run start
```

## Dashboard

```bash
npm run dashboard
```

## Config variables

| Name | Type | Default | MasterKey | 
|--|--|--|--|
| avgDistance | Number |0| true|
| maxDistance | Number |0| true|
| radiusDistance | Number |0| true|
| radiusDistancePreferenced | Boolean |true| true|
| requestLimit | Number |10000| true|

## Classes

### ApiKey

> CLP - MasterKeyOnly

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| key | String || | true|
| requests | Number || 0 | true|
| active | Boolean || true | true|

### Cache

> CLP - MasterKeyOnly

| Name | Type | Class | Default | Required | 
|--|--|--|--|--|
| location | Geopoint || | true|
| text | String || | true|
| usage | Number || 0 | true|
| avgDistance | Number || | true|
