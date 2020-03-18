const mdb = require("../index")

async function main()
{
    const client = await mdb.connect("mysql://root:123456@192.168.1.4",{log:console.log})

    const db = client.db("project")

    const collection = db.collection("user")

    let cursor = await collection.find({})

    console.table(cursor.toArray())

    collection.updateOne({ _id: 1 }, { $set: { name: "张三" } }, { upsert: 1 })

    let data = await collection.findOne({ _id: 1 })

    console.dir(data)

    data = await collection.findOne({ name: "张三" },{projection:{name:1}})

    console.dir(data)

    collection.updateOne({ _id: 1 }, { $set: { level: 3,fight:{count : 1} } }, { upsert: 1 })
    collection.updateOne({ _id: 2 }, { $set: { name: "李四",level:4 } }, { upsert: 1 })

    cursor = await collection.find({})

    console.table(cursor.toArray())

    await collection.updateOne({ _id: 1 }, { $set: { fight:{count : 2 } }}, { upsert: 1 })

    cursor = await collection.find({})

    console.table(cursor.toArray())

    await collection.deleteOne({_id:1})

    await collection.deleteMany({})
}

main()