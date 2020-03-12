const {set_columns,is_json_key} = require("./mysql")

module.exports = function(name)
{
    return new Inserter(name)
}

class Inserter
{
    constructor(name)
    {
        this._table = name

        this._values = {}
    }

    set(key,val)
    {
        this._values[key] = val

        return this
    }

    done()
    {
        let columns = {_content:{}}

        for(let key in this._values)
        {
            let val = this._values[key]

            if(is_json_key(key))   
            {
                columns._content[key] = val
            }
            else        //下划线开头的，归到最外面一列
            {
                columns[key] = val
            }
        }

        return `INSERT INTO ${this._table} SET ${set_columns(columns)};`
    }
}