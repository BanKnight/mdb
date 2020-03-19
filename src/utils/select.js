const {json_extract} = require("./mysql")
const where = require("./where")

module.exports = function(name)
{
    return new Select(name)
}

class Select
{
    constructor(name)
    {
        this._from = name
        this._indexes = null
        this._cols = ""
        this._where = ""
        this._order = ""
        this._skip = ""
        this._limit = ""
    }

    indexes(info)
    {
        this._indexes = info
        return this
    }

    /**
     * 将_content中的映射出来
     */
    cols(info)
    {
        let cols = []
        for(let key in info)
        {
            cols.push(`${json_extract(key)} as \`${key}\``)
        }

        this._cols = cols.join(",")

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
        return `SELECT ${this._cols} FROM ${this._from} ${this._where} ${this._order} ${this._limit};`
    }
}