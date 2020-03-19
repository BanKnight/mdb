module.exports = class Meta
{
    constructor()
    {
        this.cols = {}
        this.engine = ""
        this.charset = ""
        this.indexes = {}       //[name] = {cols:[col_name,col_name],option}
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

    get_index(name)
    {
        let index = this.indexes[name]
        if(index)
        {
            return index
        }

        index = {cols:[]}

        this.indexes[name] = index

        return index
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