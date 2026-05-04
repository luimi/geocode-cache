Parse.Cloud.job("resetUsage", async (request) => {
    const { params, headers, log, message } = request;
    message("Starting job");

    const apikeys = await new Parse.Query("ApiKey").find({ useMasterKey: true });
    apikeys.forEach(apikey => {
        apikey.set("requests", 0);
    });

    await Parse.Object.saveAll(apikeys, { useMasterKey: true })

    return "API usage restarted";
});