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

// TaskBroker.prototype.onChannelCreated= function (channel) {
//   this.rabbit.channel = channel;
//   return channel.assertQueue(this.queueName, {durable: true});
// };

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
        this.mongo.client = new MongoClient('mongodb://localhost:27017/dockerApp', {useNewUrlParser:true});
        this.mongo.client.connect((err)=>{
          const temp_db = this.mongo.client.db();
          this.mongo.db = temp_db.collection('User');
        });
        
        return this.mongo.db;
    }.bind(this);
};

TaskBroker.prototype.connect = function(){
    return this.connectRabbit()
    .then(this.connectMongo())
};

TaskBroker.prototype.disconnect = function(){
    this.mongo.client.close();
    this.rabbit.channel.close();
    this.rabbit.connection.close();
};



TaskBroker.prototype.getTask = function() {
  return this.mongo.db.find({}).toArray()

};

TaskBroker.prototype.produceTask = function() {
  return function(message) {
    if(message != null) {
      this.rabbit.channel.sendToQueue(this.queueName, new Buffer(JSON.stringify(message)), { deliveryMode: true });
      console.log("Successfully took db object");
      return message;
    }
    return null;
  }.bind(this);
};


var taskBroker = new TaskBroker();


taskBroker.connect()
  .then(function() {
    setInterval(
      function() {
        taskBroker.getTask()
          .then(taskBroker.produceTask())
            .then(function(result){
            if(result == null) {
              console.log('No job to produce');
            } else {
              console.log('Produce', result);
            }

          },function(error){
            console.log('error',error.stack);
          }
          );
      }
      ,1000
  );
});
    
          