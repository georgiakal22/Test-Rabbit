var amqp = require('amqplib');
const { fineStructureDependencies } = require('mathjs');
var mongo = require('mongod');
const { Collection } = require('mongoose');
var _ = require('underscore');
const MongoClient = require('mongodb').MongoClient;


var TaskBroker = function(){
    this.queueName = 'web';
    this.rabbit = {};
    this.mongo= {};
};

// TaskBroker.prototype.onConnect= function (connection){
//   this.rabbit.connection = connection;
//   return connection.createChannel();
// };

TaskBroker.prototype.onChannelCreated= function (channel) {
  this.rabbit.channel = channel;
  return channel.assertQueue(this.queueName, {durable: true});
};

TaskBroker.prototype.connectRabbit = function(){
    return amqp.connect('amqp://localhost:5672')
    .then(function onConnect(connection) {
      this.rabbit.connection = connection;
      return connection.createChannel()
    }.bind(this))

    .then(function onChannelCreated(channel) {
      this.rabbit.channel = channel;
      return channel.assertQueue(this.queueName, {durable: true});
    }.bind(this))

};

TaskBroker.prototype.connectMongo = function(){
    return function(){
        const client = new MongoClient("mongodb://localhost:27017/dockerApp", {useNewUrlParser:true});
        client.connect(err=>{
          this.mongo.db = client.db("dockerApp").collection("User");
          client.close();

        });
        
                
        return this.mongo.db;
    }.bind(this);
};

TaskBroker.prototype.connect = function(){
    return this.connectRabbit()
    .then(this.connectMongo())
};

TaskBroker.prototype.disconnect = function(){
    this.mongo.db.close();
    this.rabbit.channel.close();
    this.rabbit.connection.close();
};



TaskBroker.prototype.getTask = function() {
  this.mongo.db.find({}).toArray(function(err,result){
    if(err) throw err;
    this.rabbit.channel.sendToQueue(this.queueName,new Buffer(result), {deliveryMode:true});
  });
  console.log("Successfully took db object");
    
};

var taskBroker = new TaskBroker();


taskBroker.connect()
  .then(function() {
    setInterval(
      function() {
      taskBroker.getTask()
      }
      ,1000
  );
});
    
          