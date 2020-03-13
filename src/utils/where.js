const {json_extract,string_val} = require("./mysql")

module.exports = function(cond)
{
    let filters = []

    for (let key in cond)
    {
        let val = cond[key]
        
        make_key_filter(key, val,filters)
    }

    if(filters.length > 0)
    {
        return `WHERE ${filters.join(" AND ")}`

    }

    return ""
}

/**
 * name : {$gt:1}
 * name : 1
 */
function make_key_filter(key, val,filters)
{
    if (typeof (val) == "object")       //里面的key 必然都是$开头
    {
        for (let cmd in val)
        {
            let filter = directives[cmd](key, val[cmd])

            filters.push(filter)
        }
    }
    else
    {
        let filter = directives["$="](key, val)

        filters.push(filter)
    }
}

const directives = {}

directives["$="] = (key, val) =>
{
    return `${json_extract(key)} = ${string_val(val)}`
}

directives["$gt"] = (key, val) =>
{
    return `${json_extract(key)} > ${string_val(val)}`
}

directives["$lt"] = (key, val) =>
{
    return `${json_extract(key)} < ${string_val(val)}`
}

directives["$gte"] = (key, val) =>
{
    return `${json_extract(key)} >= ${string_val(val)}`
}

directives["$lte"] = (key, val) =>
{
    return `${json_extract(key)} <= ${string_val(val)}`
}

