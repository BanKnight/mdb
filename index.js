const Client = require("./src/Client")

module.exports = {
    async connect(connect_str, option)
    {
        let client = new Client(connect_str, option)

        await client.connect()

        return client
    }
}