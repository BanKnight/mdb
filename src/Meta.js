module.exports = class Meta
{
    constructor()
    {
        this.cols = {}
        this.engine = ""
        this.charset = ""
        this.indexes = {}
        this.primary = null
    }

    add_col(field,data_type,default_val,extra)
    {
        let col = this.get_col(field)

        if(data_type)
        {
            col.type = data_type
        }
        if(default_val)
        {
            col.default = default_val
        }
        if(extra)
        {
            col.extra = extra
        }
    }

    get_col(field)
    {
        let col = this.cols[field]
        if(col)
        {
            return col
        }

        col = {field}

        this.cols[field] = col

        return col
    }

    clone()
    {
        let copy = new Meta()

        copy.cols = JSON.parse(JSON.stringify(this.cols))
        copy.indexes = JSON.parse(JSON.stringify(this.indexes))

        copy.engine = this.engine
        copy.charset = this.charset
        copy.primary = this.primary

        return copy
    }
}