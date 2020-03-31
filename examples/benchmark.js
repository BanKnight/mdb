const mdb = require("../index")

async function run(name, func, option = {})
{
    option.times = option.times || 1

    let start = process.uptime() * 1000;

    for (let i = 0; i < option.times; ++i)
    {
        await func(i)
    }

    let stop = process.uptime() * 1000;
    let total = stop - start

    console.log(`[${name}] total:${total} / ms,times:${option.times},average:${total / option.times} / ms`)
}


async function main()
{
    const client = await mdb.connect("mysql://root:123456@192.168.1.4:3310")

    const db = client.db("project")

    const test_insert = db.collection("test_insert")

    await test_insert.truncate()

    await run("test_insert", async (i) =>
    {
        await test_insert.insertOne({ _id: i, union: i + 1, member: i + 2, lvl: 10 })
    }, { times: 1000 })

    await run("test_update", async (i) =>
    {
        await test_insert.updateOne({ _id: i }, { $set: { union: i + 2, member: i + 3, lvl: 11 } })
    }, { times: 1000 })

    process.exit(0)
}


main()