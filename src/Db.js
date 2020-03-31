
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

    async drop_table(name)
    {
        let collection = this.collections[name]

        delete this.collections[name]

        if (collection)
        {
            await collection.drop()
        }
        else
        {
            await this.connection.query(
                `DROP TABLE IF EXISTS \`${this.name}\`.\`${name}\``
            )
        }
    }
}