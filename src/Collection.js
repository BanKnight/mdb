/**
 * 表的固定结构是：
 * {
 *  _id:varchar(32)/bingint(20),固定key，作为主键,
 *  content：json,作为内容
 *  updated:int(4),上次更新时间
 * }
 */

const shortid  = require("shortid").generate

const Cursor = require("./Cursor")
const Meta = require("./Meta")

const mysql = require("./utils/mysql")
const select = require("./utils/select")
const insert = require("./utils/insert")
const update = require("./utils/update")
const delete_ = require("./utils/delete_")
const create_table = require("./utils/create_table")

const default_projection = {_id : 1,_content:1}

const empty = {}

module.exports = class Collection
{
    constructor(db, name)
    {
        this.db = db
        this.name = name
        this.full_name = `\`${this.db.name}\`.\`${this.name}\``

        this.meta = null        //实际表结构
        this.shadow_meta = new Meta()               //要改成的表结构
        this.cmds = [this._load_meta.bind(this)]

        this.connection = db.connection

        this.doing = false
    }


    find(cond, option)
    {
        option = option || {}

        option.projection = option.projection || default_projection
        option.projection._id = option.projection._id || 1
        option.projection._content = option.projection._content || 1

        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {
                const cursor = new Cursor(cond,option)

                if(!this.meta)
                {
                    resolve(cursor)
                    return
                }

                try
                {
                    const selecter = select(this.full_name)
                        .indexes(this.meta.indexes)         //传递索引信息，以优化后面的cols以及where
                        .cols(option.projection)
                        .where(cond)
                        .order(option.sort)

                    for(let i = 0;;++i)
                    {
                        const sql = selecter.limit(mysql.select_page * i,mysql.select_page)
                            .done()
        
                        const results = await this.connection.query(sql)
                        const datas = results[0]
                        
                        for(let one of datas)
                        {
                            cursor.push(one)
                        }

                        if(datas.length < mysql.select_page)
                        {
                            break
                        }
                    }
                    resolve(cursor)
                }
                catch(e)
                {
                    reject(e)
                }
            })

            this._do()
        })
    }

    async findOne(cond, option)
    {
        option = option || {}

        option.projection = option.projection || default_projection
        option.projection._id = option.projection._id || 1

        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {
                if(!this.meta)
                {
                    resolve()
                    return
                }

                try
                {
                    const sql = select(this.full_name)
                        .indexes(this.meta.indexes)         //传递索引信息，以优化后面的cols以及where
                        .cols(option.projection)
                        .where(cond)
                        .order(option.sort)
                        .limit(1)
                        .done()

                    const cursor = new Cursor(cond,option)

                    const results = await this.connection.query(sql)

                    const datas = results[0]

                    for(let one of datas)
                    {
                        cursor.push(one)
                    }
                    if(cursor.hasNext())
                    {
                        resolve(cursor.next())
                    }
                    else
                    {
                        resolve()
                    }
                }
                catch(e)
                {
                    reject(e)
                }
            })

            this._do()
        })
    }

    /**
     * length
     * fields = {a:a_length,b:b_length}
     * option = {unique:1}
     * 
     * 解释：json中的索引是通过创建虚拟列搞定的，需要确定字段名 + 类型
     * 而字符串类型还需要再指定长度，比较麻烦
     * 
     * @param {列} fields 
     * @param {选项} option 
     */
    createIndex(fields, option)
    {
        option = option || {}

        let cols = []
        for(let key in fields)
        {
            if(mysql.is_json_key(key) == false)         //如果是默认列，那么不允许创建
            {
                throw new Error("default col can't be indexed")
            }
            cols.push(key)
        }

        cols.sort()

        const name = cols.join("+")                 //确定名字

        this.cmds.push(async ()=>
        {
            if(this.shadow_meta.indexes[name])          //检查是否已经有了这个索引
            {
                return
            }

            if(this.shadow_meta == this.meta)           //copy on write
            {
                this.shadow_meta = this.shadow_meta.clone()                 
            }

            this.shadow_meta.indexes[name] = Object.assign({cols},option)

            //此时数据类型可能还需要后续收集，暂时不做meta之间的同步
        })

        this._do()
    }

    async insertOne(data)
    {
        data._id = data._id || shortid()

        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {
                
                try
                {
                    await this._sync_meta(data)                

                    //插入数据
                    const inserter = insert(this.full_name)

                    for(let key in data)
                    {
                        inserter.set(key,data[key])
                    }
                    
                    const sql = inserter.done()  
                    
                    await this.connection.query(sql)

                    resolve()
                }
                catch(e)
                {
                    reject(e)
                }
            })

            this._do()
        })
    }

    async insertMany(data)
    {
        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {
                try
                {
                    let promises = []

                    for(let one of data)
                    {
                        one._id = one._id || shortid()

                        await this._sync_meta(one)                
    
                        //插入数据
                        const inserter = insert(this.full_name)
    
                        for(let key in one)
                        {
                            inserter.set(key,one[key])
                        }
                        
                        const sql = inserter.done()  

                        promises.push(this.connection.query(sql))
                    }

                    await Promise.all(promises)

                    resolve()
                }     
                catch(e)
                {
                    reject(e)
                }
            })

            this._do()
        })
    }

    async updateOne(cond, operation, option)
    {
        option = option || empty

        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {
                
                try
                {
                    await this._sync_meta(cond, operation)                

                    const updator = update(this.full_name)
                    let sql = updator.set(operation)
                        .indexes(this.meta.indexes)         //传递索引信息，以优化后面的where
                        .where(cond)
                        .limit(1)
                        .done()

                    const result = await this.connection.query(sql)

                    if(result[0].affectedRows > 0)
                    {
                        resolve()
                        return
                    }

                    if(!option.upsert)
                    {
                        resolve()
                        return
                    }

                    //插入数据
                    const inserter = insert(this.full_name)
                    for(let key in updator._values)
                    {
                        inserter.set(key,updator._values[key])
                    }
                    for(let key in cond)
                    {
                        inserter.set(key,cond[key])
                    }

                    sql = inserter.done()  
                    
                    await this.connection.query(sql)

                    resolve()
                }
                catch(e)
                {
                    reject(e)
                }
            })

            this._do()
        })
    }

    async updateMany(cond, operation, option)
    {
        option = option || empty

        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {                    
                try
                {
                    await this._sync_meta(cond, operation)

                    const sql = update(this.full_name)
                        .set(operation)
                        .indexes(this.meta.indexes)         //传递索引信息，以优化后面的where
                        .where(cond)
                        .done()

                    await this.connection.query(sql)

                    resolve()
                }
                catch(e)
                {
                    reject(e)
                }
            })

            this._do()
        })
    }

    async deleteOne(cond)
    {
        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {
                if(!this.meta)      //没有表，或者还没有创建
                {
                    resolve()
                    return
                }

                try
                {
                    const sql = delete_(this.full_name)
                        .indexes(this.meta.indexes)         //传递索引信息，以优化后面的where
                        .where(cond)
                        .limit(1)
                        .done()

                    await this.connection.query(sql)

                    resolve()
                }
                catch(e)
                {
                    reject(e)
                }
            })

            this._do()
        })
    }

    is_no_cond(cond)
    {
        if(cond == null)
        {
            return true
        }

        for(let key in cond)
        {
            return false
        }

        return true
    }

    async deleteMany(cond)
    {
        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {
                if(!this.meta)      //没有表，或者还没有创建
                {
                    resolve()
                    return
                }

                try
                {
                    let sql = delete_(this.full_name)
                            .indexes(this.meta.indexes)         //传递索引信息，以优化后面的where
                            .where(cond)
                            .done()

                    await this.connection.query(sql)

                    resolve()
                }
                catch(e)
                {
                    reject(e)
                }
            })

            this._do()
        })
    }

    /**
     * 从数据库读取表结构信息
     */
    async _load_meta()
    {
        try
        {
            let results = await this.connection.query(`SELECT COUNT(1) AS count FROM \`information_schema\`.\`TABLES\` WHERE \`TABLE_NAME\`=\"${this.name}\" AND \`TABLE_SCHEMA\`=\"${this.db.name}\" ;`)
            let result = results[0]

            if(result[0].count == 0)          //表不存在
            {
                this._init_shadow_meta()
                return
            }

            this.meta = new Meta()

            //搞定表结构
            results = await this.connection.query(`SHOW COLUMNS FROM ${this.full_name};`)
            result = results[0]
    
            for(let one of result)
            {   
                if(mysql.is_json_key(one.Field))       //虚拟列，映射 _content中的字段
                {
                    this.meta.add_col(one.Field,one.Type,one.Default,`generated always AS (_content->>'$.${one.Field}')`)
                }
                else                                   //实际列
                {
                    this.meta.add_col(one.Field,one.Type,one.Default,one.Extra)
                }
            }

            //以下搞定索引
            results = await this.connection.query(`SHOW INDEX FROM ${this.full_name}`)
            result = results[0]

            for(let one of result)
            {
                if(one.Key_name == "PRIMARY")
                {
                    this.meta.primary = one.Column_name
                }
                else
                {
                    let index = this.meta.get_index(one.Key_name)

                    index.cols.push(one.Column_name)

                    index.unique = one.Non_unique == 0 ? 1:0
                }
            }

            this.shadow_meta = this.meta
        }
        catch(e)        //找不到表
        {
            this.meta = null

            this._init_shadow_meta()
        }
    }

    /**
     * 创建默认的表结构
     */
    async _init_shadow_meta()
    {
        this.shadow_meta.add_col("_id",mysql.DATATYPE.BIGINT)
        this.shadow_meta.add_col("_content",mysql.DATATYPE.JSON)
        this.shadow_meta.add_col("_inserted",mysql.DATATYPE.TIMESTAMP,mysql.DEFAULT_VALUE.CURRENT_TIME)
        this.shadow_meta.add_col("_updated",mysql.DATATYPE.TIMESTAMP,mysql.DEFAULT_VALUE.CURRENT_TIME,mysql.EXTRA.UPDATE_TIMESTAMP)

        this.shadow_meta.primary = "_id"

        this.shadow_meta.engine = "Innodb"
        this.shadow_meta.charset = "utf8"
    }

    /**
     * 创建虚拟列以及更新列的设定
     */
    async _parse_meta(cond,operation = empty)
    {
        let data = Object.assign({},cond,operation["$set"] || operation)

        //创建索引需要的虚拟列虚拟列
        for(let name in this.shadow_meta.indexes)                   //不包含_id的索引
        {
            const index = this.shadow_meta.indexes[name]            //索引信息

            for(let col_name of index.cols)                         //作为索引的字段单独抽出来作为虚拟列
            {
                let val = data[col_name]
                let tp = typeof(val)

                switch(tp)
                {
                    case "string":                                  
                        this.shadow_meta.add_col(col_name,mysql.DATATYPE.VARCHAR,null,mysql.EXTRA.VIRTUAL_JSON)
                        break
                    case "number":
                        this.shadow_meta.add_col(col_name,mysql.DATATYPE.BIGINT,null,mysql.EXTRA.VIRTUAL_JSON)
                        break
                }
            }
        }

        if(data._id == null)
        {
            return
        }

        let tp = typeof(data._id)               //修改_id的数据类型

        if(tp == "string")              //发现是字符串类型，那么修改列的类型
        {
            this.shadow_meta.add_col("_id",mysql.DATATYPE.VARCHAR)
        }
        else if(tp == "number")
        {
            this.shadow_meta.add_col("_id",mysql.DATATYPE.BIGINT)
        }
    }

    /**
     * 同步 meta 和 shadow_meta
     */
    async _sync_meta(cond, operation)
    {
        if(this.meta == null)      //还没创表
        {
            this._parse_meta(cond,operation)
            await this._create_table()
            return
        }

        if(this.meta == this.shadow_meta)
        {
            return
        }

        this._parse_meta(cond,operation)
        
        //同步列
        for(let col_name in this.shadow_meta.cols)
        {
            let col = this.shadow_meta.cols[col_name]
            let exists = this.meta.cols[col_name]

            if(exists)
            {
                continue
            }

            //不同步的唯一可能是：虚拟列，映射 _content中的字段
            await this.connection.query(`ALTER TABLE ${this.full_name} ADD \`${col_name}\` ${col.type} generated always AS (_content->>'$.${col_name}')`)
        }

        //同步索引
        for(let index_name in this.shadow_meta.indexes)
        {
            let index  = this.shadow_meta.indexes[index_name]
            let exists = this.meta.indexes[index_name]

            if(exists)
            {
                continue
            }

            let col_names = []

            for(let col of index.cols)
            {
                col_names.push(`\`${col}\``)
            }

            if(index.unique)
            {
                this.connection.query(`ALTER TABLE ${this.full_name} ADD UNIQUE \`${index_name}\`(${col_names.join(",")});`)
            }
            else
            {
                this.connection.query(`ALTER TABLE ${this.full_name} ADD INDEX \`${index_name}\`(${col_names.join(",")});`)
            }
        }

        this.meta = this.shadow_meta
    }

    /**
     * 第一次写入的时候触发
     */
    async _create_table()
    {
        const creator = create_table(this.full_name).if_not_exists()

        for(let col_name in this.shadow_meta.cols)
        {
            let col = this.shadow_meta.cols[col_name]

            if(mysql.is_json_key(col.field))       //虚拟列，映射 _content中的字段
            {
                creator.add_col(col.field,col.type,col.default,`generated always AS (_content->>'$.${col_name}')`)
            }
            else                                   //实际列
            {
                creator.add_col(col.field,col.type,col.default,col.extra)
            }
        }

        const sql = creator.primary(this.shadow_meta.primary)
            .engine(this.shadow_meta.engine)
            .charset(this.shadow_meta.charset)
            .done()

        await this.connection.query(sql)

        //接下来创建索引
        for(let index_name in this.shadow_meta.indexes)
        {
            let index = this.shadow_meta.indexes[index_name]

            let col_names = []

            for(let col of index.cols)
            {
                col_names.push(`\`${col}\``)
            }

            if(index.unique)
            {
                this.connection.query(`ALTER TABLE ${this.full_name} ADD UNIQUE \`${index_name}\`(${col_names.join(",")});`)
            }
            else
            {
                this.connection.query(`ALTER TABLE ${this.full_name} ADD INDEX \`${index_name}\`(${col_names.join(",")});`)
            }
        }

        this.meta = this.shadow_meta
    }

    async _do()
    {
        if(this.doing)
        {
            return
        }
        this.doing = true

        while(this.cmds.length > 0)
        {
            let cmd = this.cmds.shift()

            try
            {
                await cmd()
            }
            catch(e)
            {
                console.error(e)
            }
        }
        this.doing = false
    }
}