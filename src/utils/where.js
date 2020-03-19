const {json_extract,string_val} = require("./mysql")

module.exports = function(cond,indexes)
{
    let filters = []
    let sorted_cond = []

    let indexed_col = parse_indexed_col(indexes)

    for (let key in cond)
    {
        let val = cond[key]

        sorted_cond.push({key,val})  
    }

    sorted_cond.sort()

    for(let one of sorted_cond)
    {
        let {key,val} = one

        make_key_filter(key, val,filters,indexed_col)
    }

    if(filters.length > 0)
    {
        return `WHERE ${filters.join(" AND ")}`
    }

    return ""
}

function parse_indexed_col(indexes)
{
    const cols = {}

    for(let index_name in indexes)
    {
        let index = indexes[index_name]
        for(let col of index.cols)
        {
            cols[col] = 1
        }
    }

    return cols
}

/**
 * name : {$gt:1}
 * name : 1
 */
function make_key_filter(key, val,filters,indexed_col)
{
    if (typeof (val) == "object")       //里面的key 必然都是$开头
    {
        for (let cmd in val)
        {
            let filter = directives[cmd](key, val[cmd],indexed_col)

            filters.push(filter)
        }
    }
    else
    {
        let filter = directives["$="](key, val,indexed_col)

        filters.push(filter)
    }
}

const directives = {}

directives["$="] = (key, val,indexed_col) =>
{
    if(indexed_col[key])
    {
        return `\`${key}\` = ${string_val(val)}`
    }

    return `${json_extract(key)} = ${string_val(val)}`
}

directives["$gt"] = (key, val,indexed_col) =>
{
    if(indexed_col[key])
    {
        return `\`${key}\` > ${string_val(val)}`
    }
    return `${json_extract(key)} > ${string_val(val)}`
}

directives["$lt"] = (key, val,indexed_col) =>
{
    if(indexed_col[key])
    {
        return `\`${key}\` < ${string_val(val)}`
    }
    return `${json_extract(key),indexed_col} < ${string_val(val)}`
}

directives["$gte"] = (key, val) =>
{
    if(indexed_col[key])
    {
        return `\`${key}\` >= ${string_val(val)}`
    }
    return `${json_extract(key),indexed_col} >= ${string_val(val)}`
}

directives["$lte"] = (key, val,indexed_col) =>
{
    if(indexed_col[key])
    {
        return `\`${key}\` <= ${string_val(val)}`
    }
    return `${json_extract(key)} <= ${string_val(val)}`
}

