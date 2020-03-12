const {set_columns,json_set,is_json_key} = require("./mysql")
const where = require("./where")

module.exports = function(name)
{
    return new Updator(name)
}

class Updator
{
    constructor(name)
    {
        this._table = name

        this._op = null
        this._values = {}

        this._where = ""
        this._limit = ""
    }

    set(op)
    {
        if(op["$set"] != null)
        {
            this._op = "set"
            this._values = op["$set"]
        }
        else
        {
            this._values = op
        }

        delete this._values._id

        return this
    }

    indexes()
    {
        return this

    }

    where(cond)
    {
        if(cond == null)
        {
            return this
        }

        this._where = where(cond)

        return this
    }

    limit(size)
    {
        if(size)
        {
            this._limit = `limit ${size}`
        }

        return this
    }

    done()
    {
        let columns = {_content:{}}     //收集

        for(let key in this._values)
        {
            let val = this._values[key]

            if(is_json_key(key))
            {
                columns._content[key] = val
            }
            else
            {
                columns[key] = val
            }
        }

        if(this._op == null)      //完整覆盖_content
        {
            return `UPDATE ${this._table} SET ${set_columns(columns)} ${this._where} ${this._limit};`
        }

        //只更新字段，这里不采用json_merge_patch，因为他采用的是合并,而我们要的是字段覆盖，因此采用json_set来模拟
        if(this._op == "set")           
        {
            return `UPDATE ${this._table} SET ${json_set("_content",columns._content)} ${this._where} ${this._limit};`
        }
    }
}