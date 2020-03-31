# mdb
用mysql作为存储介质，提供类似于mongodb的接口

# 封装用法
+ mdb.connect(url):连接数据库，url格式：mysql://user:password@host:port
+ collection.updateOne(cond,opertion,option):根据cond更新记录，option支持upsert(不存在即写入)
+ collection.updateMany(...):更新多条记录
+ collection.insertOne(data):插入单条记录,不指定_id情况下，使用auto_increment
+ collection.insertMany(data):插入多条记录
+ collection.find(cond,option):查找记录，返回的是cursor
+ collection.findOne(...):查找单条数据，支持对json中的字段查找，也支持索引查找，写法参考mongo中的$lt等
+ collection.createIndex(fields,option):创建json字段中的额外索引(虚拟列)，会在真正写入的时候创建索引
+ collection.deleteOne(cond):指定条件下删除一条记录
+ collection.deleteMany(cond):指定条件下删除所有记录
+ collection.truncate():清空

# 原理
将mongodb的bson结构存放在mysql的json字段中，封装这个json字段的使用，使得就好像在使用mongodb

# 表结构
+ _id: bigint(20)/varchar(32),作为主键，写入时候必须指定
+ _content：json,作为json的内容
+ _inserted: timestamp,插入的时间
+ _updated: timestamp,更新的时间

# 缺点
+ upsert特性：在更新失败后，会进行插入，因此对插入较多的场合（例如日志应用，更建议使用insert接口），操作次数比实际需要多出一倍
+ 性能差：对json的insert和update的操作，性能削减严重，耗时大约100ms，相比普通情况下是大约1ms

# 使用例子
[例子](https://github.com/BanKnight/mdb/blob/master/examples/simple.js)
