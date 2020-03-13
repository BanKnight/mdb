module.exports = function(name)
{
    return new Indexer(name)
}

class Indexer
{
    constructor(name)
    {
        this._table = name
        this._name = ""
        this._meta = null
    }

    meta(cols)
    {
        this._meta = cols
    }

    make(name,cols,unique)
    {
        this._name = name

        

    }

    done()
    {

    }
}