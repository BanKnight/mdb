module.exports.select_page = 3000

const default_cols = {_id:1,_content:1,_updated:1,_inserted:1}

module.exports.DATATYPE = {
    TEXT:"text",
    VARCHAR:"varchar(32)",
    INT:"int(11)",
    BIGINT:"bigint(20)",
    JSON:"json",
    TIMESTAMP:"timestamp",
}

module.exports.DEFAULT_VALUE = {
    CURRENT_TIME:"CURRENT_TIMESTAMP",
}

module.exports.EXTRA = {
    VIRTUAL_JSON:"VIRTUAL GENERATED",
    UPDATE_TIMESTAMP:"ON UPDATE CURRENT_TIMESTAMP",
}


function is_json_key(key)
{
    if(default_cols[key])
    {
        return false
    }
    return true
}

module.exports.is_json_key = is_json_key

module.exports.json_extract = (key)=>
{
    if(is_json_key(key))
    {
        return `_content->>'$.${key}'`
    }
    return `\`${key}\``
}

module.exports.json_set = (col_name,values)=>
{
    let sqls = []

    for(let key in values)
    {
        let val = values[key]
        let tp = typeof(val)

        sqls.push(`'$.${key}'`)

        switch(tp)
        {
            case "string":
                sqls.push(`"${val}"`)
                break
            case "object":
                sqls.push(`CAST('${JSON.stringify(val)}' AS JSON)`)         //注意这里的不同
                break
            default:
                sqls.push(val.toString() )
                break
        }  
    }

    return `${col_name}=JSON_SET(${col_name},${sqls.join(",")})`
}


function string_val(val)
{
    let tp = typeof(val)
    switch(tp)
    {
        case "string":
            return `"${val}"`
        case "object":
            return `'${JSON.stringify(val)}'`
        default:
            return val.toString()     
            break
    }   
}

module.exports.string_val = string_val

module.exports.set_columns = (values)=>
{
    let sqls = []

    for(let key in values)
    {
        let val = values[key]

        sqls.push(`\`${key}\`=${string_val(val)}`)
    }

    return sqls.join(",")
}

module.exports.make_projection = (data)=>
{
    let content = data._content

    delete data._content

    if(content == null)
    {
        return data
    }

    Object.assign(data,content)

    return data
}



