
const Collection = require("./Collection")

module.exports = class Db
{
    constructor(client, name)
    {
        this.client = client
        this.name = name
        this.collections = {}

        this.connection = client.connection

        this.connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${this.name}\` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;`
        )
    }

    collection(name)
    {
        let collection = this.collections[name]
        if (collection == null)
        {
            collection = new Collection(this, name)

            this.collections[name] = collection
        }

        return collection
    }
}