const amqp = require("amqplib");
connect();
async function connect(){
    try{
        const connection = await amqp.connect("amqp://localhost:5672");
        const channel = await connection.createChannel();
        const function_queue = await channel.assertQueue("kalman");

        channel.consume("kalman", message =>{
            const input = JSON.parse(message.content.toString());
            console.log("Receive");
            
        })
    }
    catch(ex){
        console.log(ex);
    }
}
