exports.reverse = async (latitude, longitude, config) => {
    const point = new Parse.GeoPoint({ latitude: latitude, longitude: longitude });

    // 1. Búsqueda en caché y retorno rápido si se encuentra
    const cache = await new Parse.Query("Cache")
        .withinKilometers(
            "location",
            point,
            config.get("radiusDistancePreferenced") ? config.get("radiusDistance") : config.get("maxDistance"),
            true)
        .first({ useMasterKey: true })

    if (cache) {
        // Actualización de la caché en segundo plano, sin esperar el resultado
        cache.set("avgDistance", (cache.get("avgDistance") + cache.get("location").kilometersTo(point)) / 2);
        cache.increment("usage");
        cache.save(null, { useMasterKey: true }); // No se usa await aquí

        return { success: true, location: cache.get("location"), address: cache.get("text") };
    }

    // 2. Lógica principal de búsqueda si no hay caché
    const apikey = await new Parse.Query("ApiKey")
        .lessThan("requests", config.get("requestLimit"))
        .equalTo("active", true)
        .first({ useMasterKey: true });

    if (!apikey) return { success: false, message: "No apikey available" };

    let google = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apikey.get("key")}`);
    google = await google.json();

    if (!google.results || google.results.length === 0) {
        apikey.set("active", false);
        apikey.save(null, { useMasterKey: true });
        return { success: false, message: google.error_message ? google.error_message : "No address found" };
    }

    // Actualización de la API Key en segundo plano
    apikey.increment("requests");
    apikey.save(null, { useMasterKey: true });

    const addresses = google.results.filter((a) => !a.geometry.bounds).map((address) => {
        const location = new Parse.GeoPoint({
            latitude: address.geometry.location.lat,
            longitude: address.geometry.location.lng
        });
        return {
            address: address.formatted_address,
            location: location,
            distance: location.kilometersTo(point)
        };
    });

    if (addresses.length === 0) return { success: true, address: "address.selected", location: point, distance: 0 };

    addresses.sort((a, b) => a.distance - b.distance);

    // 3. Tareas en segundo plano para guardar la caché y actualizar la configuración
    const checkExistsAndSave = async (address) => {
        const exists = await new Parse.Query("Cache")
            .withinKilometers("location", address.location, 0, true)
            .first({ useMasterKey: true }) !== undefined;

        if (!exists) {
            const cache = new Parse.Object("Cache");
            cache.set("location", address.location);
            cache.set("text", address.address);
            cache.set("usage", 0);
            cache.set("avgDistance", address.distance);
            const acl = new Parse.ACL();
            acl.setPublicReadAccess(false);
            acl.setPublicWriteAccess(false);
            cache.setACL(acl);
            await cache.save(null, { useMasterKey: true });
        }
    };
    
    // Inicia todas las operaciones de guardado en paralelo
    Promise.all(addresses.map(checkExistsAndSave)).catch(err => {
        console.error("Error al guardar en caché:", err);
    });

    // Actualiza la configuración en segundo plano
    const bestDistance = addresses[0].distance;
    const avgDistance = config.get("avgDistance");
    const maxDistance = config.get("maxDistance");
    Parse.Config.save({}, {
        avgDistance: (avgDistance + bestDistance) / 2,
        maxDistance: maxDistance < bestDistance ? bestDistance : maxDistance
    }).catch(err => {
        console.error("Error al actualizar la configuración:", err);
    });

    // Retorno de la respuesta al usuario sin esperar a que las tareas de fondo terminen
    return { success: true, ...addresses[0] };
};