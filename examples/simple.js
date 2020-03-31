const mdb = require("../index")

async function main()
{
    const client = await mdb.connect("mysql://root:123456@192.168.1.4:3310", { log: console.log })

    const db = client.db("project")

    const collection = db.collection("user")

    collection.createIndex({ name: 1 }, { unique: 1 })
    collection.createIndex({ union: 1, member: 1 }, { unique: 1 })

    collection.insertOne({ _id: 1, name: "张三", union: 1, member: 3, lvl: 10, temp: "this is a test" })
    collection.updateOne({ _id: 2 }, { $set: { name: "李四", union: 2, member: 3, lvl: 10 } }, { upsert: 1 })

    let cursor = await collection.find({})

    console.table(cursor.toArray())

    collection.updateOne({ _id: 1 }, { $set: { is_new: true } })

    let data = await collection.findOne({ _id: 1 })
    console.dir(data)

    data = await collection.findOne({ name: "张三" }, { projection: { name: 1 } })
    console.dir(data)

    data = await collection.findOne({ union: 1, member: 3 }, { projection: { name: 1 } })
    console.dir(data)

    data = await collection.findOne({ lvl: 10 }, { projection: { name: 1 } })
    console.dir(data)

    await collection.deleteOne({ _id: 1 })

    cursor = await collection.find({})
    console.table(cursor.toArray())

    await collection.deleteMany({})
}

async function test_auto()
{
    const client = await mdb.connect("mysql://root:123456@192.168.1.4", { log: console.log })

    const db = client.db("project")

    const collection = db.collection("auto")

    collection.createIndex({ name: 1 }, { unique: 1 })
    collection.createIndex({ union: 1, member: 1 }, { unique: 1 })

    collection.insertOne({ name: "张三", union: 1, member: 3, lvl: 10, is_new: true })
    collection.insertOne({ name: "李四", union: 2, member: 3, lvl: 5 })

    let cursor = await collection.find({})

    console.table(cursor.toArray())

    let data = await collection.findOne({ name: "张三" }, { projection: { name: 1 } })

    console.dir(data)

    data = await collection.findOne({ union: 1, member: 3 }, { projection: { name: 1 } })

    console.dir(data)

    data = await collection.findOne({ lvl: 10 }, { projection: { name: 1 } })

    console.dir(data)

    await collection.deleteOne({ _id: 1 })

    cursor = await collection.find({})

    console.table(cursor.toArray())

    await collection.deleteMany({})
}

main()

// test_auto()