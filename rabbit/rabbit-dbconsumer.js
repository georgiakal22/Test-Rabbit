var amqp = require('amqplib');
const { fineStructureDependencies } = require('mathjs');
// var mongo = require('mongod');
var mongoose = require('mongoose');
var _ = require('underscore');
// const MongoClient = require('mongodb').MongoClient;
const User = require('./../models/user');


var TaskBroker = function(){
    this.queueName = 'web';
    this.rabbit = {};
    this.mongo= {};
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
        mongoose.connect('mongodb://localhost:27017/dockerApp', {useNewUrlParser:true});
        const db = mongoose.connection;
        }
};

TaskBroker.prototype.connect = function(){
    return this.connectRabbit()
    .then(this.connectMongo())
};

TaskBroker.prototype.disconnect = function(){
    this.db.close();
    this.rabbit.channel.close();
    this.rabbit.connection.close();
};



TaskBroker.prototype.getTask = function() {
  return User.find();

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
      ,10000
  );
});
    
          