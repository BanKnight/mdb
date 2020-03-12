const mysql = require("./utils/mysql")

module.exports = class Cursor
{
    constructor(cond,option)
    {
        this.data = []
        this.rpos = 0
    }

    push(one)
    {
        this.data.push(mysql.make_projection(one))
    }

    get count()
    {
        return this.data.length
    }

    hasNext()
    {
        return this.rpos < this.data.length
    }

    next()
    {
        let one = this.data[this.rpos++]

        return one
    }
    toArray()
    {
       return this.data
    }
}