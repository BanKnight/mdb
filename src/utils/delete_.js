const where = require("./where")

module.exports = function(name)
{
    return new Deleter(name)
}

class Deleter
{
    constructor(name)
    {
        this._table = name
        this._indexes = null

        this._where = ""
        this._order = ""
        this._limit = ""
    }

    indexes(info)
    {
        this._indexes = info
        return this
    }

    where(cond)
    {
        if(cond == null)
        {
            return this
        }

        this._where = where(cond,this._indexes)

        return this
    }

    order(info)
    {
        if(info == null)
        {
            return this
        }

        const columns = []

        for (let key in info)
        {
            let order = info[key]

            order = order == 1? "inc":"desc"
            
            columns.push(`\`${key}\` ${order}`)
        }

        this._order = `order by ${columns.join(",")}`

        return this
    }

    limit(offset,size)
    {
        if(offset == null)
        {
            return this
        }

        if(size == null)
        {
            this._limit = `limit ${offset}`
        }
        else
        {
            this._limit = `limit ${offset},${size}`
        }

        return this
    }

    done()
    {
        if(this._where == "" && this._limit == "")
        {
            return `TRUNCATE TABLE ${this._table};`
        }
        return `DELETE FROM ${this._table} ${this._where} ${this._order} ${this._limit};`
    }
}