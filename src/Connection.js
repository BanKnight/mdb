const mysql = require('mysql2/promise');

module.exports = class Connection
{
    constructor(option)
    {
        this.option = option
        this.mysql = null

        this.cmds = []
        this.doing = false
    }

    async connect()
    {
        this.mysql = await mysql.createConnection(this.option)
    }

    query(sql,values)
    {
        return new Promise((resolve, reject) =>
        {
            this.cmds.push({sql,values,resolve, reject})

            this.do()
        })
    }

    do()
    {
        if(this.doing == true)
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

        let cmd = this.cmds[0]

        try
        {
            const result = await this.mysql.query(cmd.sql,cmd.values)

            this.cmds.shift()

            console.log(`query success:${cmd.sql}`)

            cmd.resolve(result)

        }
        catch(error)
        {
            console.log(`query error:${cmd.sql}`,error)

            if(error == "PROTOCOL_CONNECTION_LOST")     //断开
            {
                this.mysql.close()

                this.lost_conn()

                return
            }

            this.cmds.shift()

            cmd.reject(error)
        }
        
        this.do_first()
    }

    lost_conn()
    {
        setTimeout(async ()=>
        {
            try
            {
                await this.connect()

                this.do_first()
            }
            catch(error)
            {
                this.lost_conn()
            }
        },3000)
    }
}