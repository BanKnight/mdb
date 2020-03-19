# mdb
用mysql作为存储介质，提供类似于mongodb的接口

# 表结构
+ _id: bigint(20)/varchar(32),作为主键，写入时候必须指定
+ _content：json,作为json的内容
+ _inserted: timestamp,插入的时间
+ _updated: timestamp,更新的时间

# 封装用法
+ mdb.connect(url):连接数据库，url格式：mysql://user:password@host:port
+ collection.updateOne(cond,opertion,option):根据cond更新记录，option支持upsert(不存在即写入)
+ collection.updateMany(...):更新多条记录
+ collection.find(cond,option):查找记录，返回的是cursor
+ collection.findOne(...):查找单条数据
+ collection.createIndex(...):创建json字段中的额外索引，暂不支持
+ collection.deleteOne(cond):指定条件下删除一条记录
+ collection.deleteMany(cond):指定条件下删除所有记录

# 原理
将mongodb的bson结构存放在mysql的json字段中，封装这个json字段的使用，使得就好像在使用mongodb，也因此带来一些缺点

# 缺点
+ 适用于update操作比重高的场合：由于update接口，需要满足upsert特性，在更新失败后，会进行插入，因此对插入较多的场合（例如日志应用），操作次数比实际需要多出一倍
+ 暂时缺乏json中的索引：json字段中的索引，在mysql中需要映射为虚拟列才可以做到

# 使用例子
[例子](https://github.com/BanKnight/mdb/blob/master/examples/simple.js)
