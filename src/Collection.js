/**
 * 表的固定结构是：
 * {
 *  _id:varchar(32)/int(11),固定key，作为主键,
 *  content：json,作为内容
 *  updated:int(4),上次更新时间
 * }
 */

const Cursor = require("./Cursor")
const Meta = require("./Meta")

const mysql = require("./utils/mysql")
const select = require("./utils/select")
const insert = require("./utils/insert")
const update = require("./utils/update")
const delete_ = require("./utils/delete_")
const create_table = require("./utils/create_table")

const default_projection = {_id : 1,_content:1}

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
        // option = option || {}
        // this.cmds.push(async ()=>
        // {
        //     let cols = []
        //     for(let key in fields)
        //     {
        //         if(mysql.is_json_key(key) == false)         //如果是默认列，那么不允许创建
        //         {
        //             return
        //         }
        //         cols.push(key)
        //     }
    
        //     cols.sort()
    
        //     const name = cols.join("+")                 //确定名字

        //     if(this.shadow_meta.indexes[name])          //检查是否已经有了这个索引
        //     {
        //         return
        //     }

        //     this.shadow_meta.indexes[name] = Object.assign({fields},option)

        //     //创表之后才可以同步
        //     if(this.meta)
        //     {
        //         await this._sync_meta()             
        //     }
        // })

        // this._do()
    }

    async updateOne(cond, operation, option)
    {
        option = option || empty

        return new Promise((resolve, reject) =>
        {
            this.cmds.push(async ()=>
            {
                if(this.meta == null)
                {
                    await this._parse_meta(cond, operation)

                    await this._sync_meta()                
                }

                try
                {
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
                if(this.meta == null)
                {
                    await this._parse_meta(cond, operation)

                    await this._sync_meta()
                }

                try
                {
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
     * 默认展开_content下的第一层
     */
    async _parse_meta(cond,operation)
    {
        let data = Object.assign({},cond,operation["$set"] || operation)

        // for(let key in data)
        // {
        //     if(mysql.is_json_key(key) == false)
        //     {
        //         continue
        //     }

        //     let val = data[key]
        //     let tp = typeof(val)

        //     switch(tp)
        //     {
        //         case "string":
        //             this.shadow_meta.add_col(key,mysql.DATATYPE.TEXT,null,mysql.EXTRA.VIRTUAL_JSON)
        //             break
        //         case "number":
        //             this.shadow_meta.add_col(key,mysql.DATATYPE.INT,null,mysql.EXTRA.VIRTUAL_JSON)
        //             break
        //         case "object":
        //             this.shadow_meta.add_col(key,mysql.DATATYPE.JSON,null,mysql.EXTRA.VIRTUAL_JSON)
        //             break
        //     }
        // }

        if(data._id == null)
        {
            return
        }

        let tp = typeof(data._id)

        if(tp == "string")              //发现是字符串类型，那么修改列的类型
        {
            this.shadow_meta.add_col("_id",mysql.DATATYPE.VARCHAR)
        }
        else if(tp == "number")
        {
            this.shadow_meta.add_col("_id",mysql.DATATYPE.INT)
        }
    }

    /**
     * 从数据库读取表结构信息
     */
    async _load_meta()
    {
        try
        {
            this.meta = new Meta()

            //搞定表结构
            let results = await this.connection.query(`SHOW COLUMNS FROM ${this.full_name}`)
            let result = results[0]
    
            for(let one of result)
            {    
                this.meta.add_col(one.Field,one.Type,one.Default,one.Extra)
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
                    this.meta.indexes[one.Key_name] = {
                        cols:one.Column_name.split(","),
                        unique:one.Non_unique == 0 ? 1:0
                    }
                }
            }

            this.shadow_meta = this.meta.clone()

            console.dir(results)
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
        this.shadow_meta.add_col("_id",mysql.DATATYPE.INT)
        this.shadow_meta.add_col("_content",mysql.DATATYPE.JSON)
        this.shadow_meta.add_col("_inserted",mysql.DATATYPE.TIMESTAMP,mysql.DEFAULT_VALUE.CURRENT_TIME)
        this.shadow_meta.add_col("_updated",mysql.DATATYPE.TIMESTAMP,mysql.DEFAULT_VALUE.CURRENT_TIME,mysql.EXTRA.UPDATE_TIMESTAMP)

        this.shadow_meta.primary = "_id"

        this.shadow_meta.engine = "Innodb"
        this.shadow_meta.charset = "utf8"
    }

    /**
     * 同步 meta 和 shadow_meta
     */
    async _sync_meta()
    {
        if(this.meta == null)      //还没创表
        {
            await this._create_table()
            return
        }
        
        //同步列
        for(let col_name in this.shadow_meta.cols)
        {
            let col = this.shadow_meta.cols[col_name]
            let exists = this.meta.cols[col_name]

            if(exists)
            {
                continue
            }

            await this.connection.query(`ALTER TABLE ${this.full_name} ADD \`${col_name}\` ${col.type} generated always AS (_content->'$.${col_name}')`)
        }

        //同步索引
        // for(let index_name in this.shadow_meta.indexes)
        // {
        //     let index  = this.shadow_meta.indexes[index_name]
        //     let exists = this.meta.indexes[index_name]

        //     if(exists)
        //     {
        //         continue
        //     }

        //     if(index.unique)
        //     {
        //         this.connection.query(`ALTER TABLE ${this.full_name} ADD UNIQUE ${index_name}(${index.cols.join(",")});`)
        //     }
        //     else
        //     {
        //         this.connection.query(`ALTER TABLE ${this.full_name} ADD INDEX ${index_name}(${index.cols.join(",")});`)
        //     }
        // }

        this.meta = this.shadow_meta.clone()
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

            if(mysql.is_json_key(col.field))       //映射 _content中的字段
            {
                creator.add_col(col.field,col.type,col.default,`generated always AS (_content->'$.${col_name}')`)
            }
            else
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
        // for(let index_name in this.indexes)
        // {
        //     let index = this.indexes[index_name]

        //     if(index.unique)
        //     {
        //         this.connection.query(`ALTER TABLE ${this.full_name} ADD UNIQUE ${index_name}(${index.cols.join(",")});`)
        //     }
        //     else
        //     {
        //         this.connection.query(`ALTER TABLE ${this.full_name} ADD INDEX ${index_name}(${index.cols.join(",")});`)
        //     }
        // }

        this.meta = this.shadow_meta.clone()
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