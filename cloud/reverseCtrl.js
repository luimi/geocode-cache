exports.reverse = async (latitude, longitude) => {

    const point = new Parse.GeoPoint({ latitude: latitude, longitude: longitude });

    const config = await Parse.Config.get({ useMasterKey: true });
    const cache = await new Parse.Query("Cache")
        .withinKilometers(
            "location",
            point,
            config.get("radiusDistancePreferenced") ? config.get("radiusDistance") : config.get("maxDistance"),
            true)
        .first({ useMasterKey: true })
    if (cache) {
        cache.set("avgDistance", (cache.get("avgDistance") + cache.get("location").kilometersTo(point)) / 2)
        cache.increment("usage")
        cache.save(null, { useMasterKey: true })
        return { success: true, location: cache.get("location"), address: cache.get("text") }
    }

    const apikey = await new Parse.Query("ApiKey")
        .lessThan("requests", config.get("requestLimit"))
        .equalTo("active", true)
        .first({ useMasterKey: true })

    if (!apikey) return { success: false, message: "No apikey available"};

    let google = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apikey.get("key")}`)
    google = await google.json()

    if (!google.results || google.results.length === 0) {
        apikey.set("active", false)
        apikey.save(null, {useMasterKey: true})
        return { success: false, message: google.error_message? google.error_message : "No address found"}
    }

    apikey.increment("requests");
    await apikey.save(null, { useMasterKey: true })

    const addresses = google.results.filter((a) => !a.geometry.bounds).map((address) => {
        const location = new Parse.GeoPoint({
            latitude: address.geometry.location.lat,
            longitude: address.geometry.location.lng
        })
        return {
            address: address.formatted_address,
            location: location,
            distance: location.kilometersTo(point)
        }
    })

    const checkExists = async (location) => {
        return await new Parse.Query("Cache")
            .withinKilometers("location", location, 0, true)
            .first({ useMasterKey: true }) !== undefined;
    }

    const saveAddress = async (address) => {
        const cache = new Parse.Object("Cache");
        cache.set("location", address.location);
        cache.set("text", address.address);
        cache.set("usage", 0)
        cache.set("avgDistance", address.distance)
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(false)
        acl.setPublicWriteAccess(false)
        cache.setACL(acl)
        await cache.save(null, { useMasterKey: true })
    }

    for (const address of addresses) {
        if (!await checkExists(address.location)) await saveAddress(address)
    }

    if (addresses.length === 0) return { success: true, address: "address.selected", location: point, distance: 0 }

    addresses.sort((a, b) => a.distance - b.distance)

    const avgDistance = config.get("avgDistance")
    const maxDistance = config.get("maxDistance")
    const bestDistance = addresses[0].distance
    Parse.Config.save({
        avgDistance: (avgDistance + bestDistance) / 2,
        maxDistance: maxDistance < bestDistance ? bestDistance : maxDistance
    }, { useMasterKey: true })

    return { success: true, ...addresses[0]}
}