module.exports = function(name)
{
    return new CreateTable(name)
}

const empty_str = ""

class CreateTable
{
    constructor(name)
    {
        this._name = name
        this._if_not_exists = ""
        this._col = ""
        this._primary = ""
        this._engine = ""
        this._charset = ""
    }

    if_not_exists()
    {
        this._if_not_exists = "IF NOT EXISTS"

        return this
    }

    add_col(col,data_type,default_val,extra)
    {
        if(default_val != "")
        {
            default_val = `DEFAULT ${default_val}`
        }

        this._col += `\`${col}\` ${data_type} ${default_val} ${extra},`
        
        return this
    }   

    primary(col)
    {
        this._primary = `PRIMARY KEY (\`${col}\`)`
        return this
    }

    engine(name)
    {
        this._engine = `ENGINE=${name}`
        return this
    }

    charset(name)
    {
        this._charset = `CHARSET=${name}`
        return this
    }

    done()
    {
        return `CREATE TABLE ${this._if_not_exists} ${this._name}(
            ${this._col}
            ${this._primary}
        )${this._engine} ${this._charset}`
    }
}