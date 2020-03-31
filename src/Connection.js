const mysql = require('mysql2/promise');

module.exports = class Connection
{
    constructor(option)
    {
        this.option = option
        this.mysql = null
        this.log = option.log

        this.cmds = []
        this.doing = false

        delete option.log
    }

    async connect()
    {
        this.mysql = await mysql.createConnection(this.option)
    }

    query(sql, values)
    {
        return new Promise((resolve, reject) =>
        {
            this.cmds.push({ sql, values, resolve, reject, retry: 0 })

            this.do()
        })
    }

    do()
    {
        if (this.doing == true)
        {
            return
        }

        this.doing = true

        this.do_first()
    }

    async do_first()
    {
        if (this.cmds.length == 0)
        {
            this.doing = false

            return
        }

        let cmd = this.cmds.shift()

        cmd.retry++

        try
        {
            const result = await this.mysql.query(cmd.sql, cmd.values)

            if (this.log)
            {
                this.log(`query success:${cmd.sql}`)
            }

            cmd.resolve(result)
        }
        catch (error)
        {
            if (cmd.retry < 3)          //继续尝试
            {
                this.cmds.unshift(cmd)
            }
            else 
            {
                if (this.log)
                {
                    this.log(`query error:${cmd.sql},${error}`)
                }

                cmd.reject(error)
            }

            if (error.fatal == true || error.fatal == null)           //表示连接还活着
            {
                this.mysql.close()
                this.lost_conn()

                return
            }
        }

        this.do_first()
    }

    lost_conn()
    {
        setTimeout(async () =>
        {
            try
            {
                await this.connect()
            }
            catch (error)
            {
                this.lost_conn()
                return
            }

            if (!this.doing)
            {
                return
            }

            this.do_first()
        }, 3000)
    }
}