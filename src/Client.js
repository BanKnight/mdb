
const mysql = require('mysql2/promise');

const Connection = require("./Connection")
const Db = require("./Db")

module.exports = class Client
{
    /**
     * 
     * @param {mysql://user:password@host:port} 
     * @param {} option 
     */
    constructor(url, option = {})
    {
        this.option = Object.assign({},option)
        this.dbs = {}

        this._parse(url)

        this.option.charset = this.option.charset || "utf8_general_ci"
        this.connection = new Connection(this.option)
    }

    async connect()
    {
        await this.connection.connect()

        this.connection.query("SET NAMES 'utf8';")
    }

    db(name)
    {
        let one = this.dbs[name]
        if (one == null)
        {
            one = new Db(this, name)

            this.dbs[name] = one
        }

        return one
    }
    /**
     * mysql://user:password@host:port
     * @param {*} url 
     */
    _parse(url)
    {
        url = url.substr("mysql://".length)

        let split_pos = url.indexOf("@")
        let left = ""
        let right = ""

        if(split_pos > 0)       //no @
        {
            left = url.substr(0,split_pos)
            right = url.substr(split_pos + 1)
        }
        else
        {
            right = url
        }

        if(right.length == 0)
        {
            throw new Error("invalid connect url")
        }

        let colon_pos = right.indexOf(":")

        if(colon_pos > 0)  //处理地址
        {
            this.option.host = right.substr(0,colon_pos)
            this.option.port = Number(right.substr(colon_pos + 1))
        }
        else
        {
            this.option.host = right
            this.option.port = 3306
        }

        if(left.length > 0)     //处理用户名和密码
        {
            colon_pos = left.indexOf(":")

            if(colon_pos > 0)
            {
                this.option.user = left.substr(0,colon_pos )
                this.option.password = left.substr(colon_pos + 1)
            }
            else
            {
                this.option.user = left
                this.option.password = ""
            }
        }
    }
}