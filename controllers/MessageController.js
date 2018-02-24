const redis = require('redis');

const client = redis.createClient('6379','127.0.0.1');
const subscriber = redis.createClient('6379','127.0.0.1');

subscriber.config("SET", "notify-keyspace-events", "KEA");
subscriber.on('pmessage', function(pattern,channel, msg) {
    if (msg === 'nextMsgTime') {
        echoMessage(getCurrentTime());
    }
});

// subscribe to redis 'expired' event
subscriber.psubscribe( "__keyevent@0__:expired", function (err) {
    client.do('del', 'nextMsgTime');
    echoMessage(getCurrentTime());
});

// promisify redis driver

client.do = function(job) {
    return new Promise((resolve, reject) => {
        let args = Array.from(arguments).slice(1);
        this[job].call(this, ...args, (err, val) => {
            if (err) {
                return reject(err);
            }
            return resolve(val);
        });
    })

}

// get new messages and add them to Sorted Set in redis, score = scheduled time

function MessageController() {
  this.echoAtTime = async function (req, res, next) {
    if (!req.params.message || !req.params.dateTime) {
        return res.send({err: 'No data'});
    }
    let currentTime = getCurrentTime(); 
    let time = Math.floor( (new Date(req.params.dateTime)).getTime() / 1000 );
    if (currentTime > time) {
        console.log('Message time is in the past');
        return res.send({err:'Message time is in the past.'});
    }
    try {
        let nextMsgTime = await client.do('get', 'nextMsgTime');
        if (nextMsgTime === null || time < nextMsgTime) {
            await client.do('set', 'nextMsgTime', time);
            await client.do('expire', 'nextMsgTime',  time - currentTime);
        }
        await client.do('zadd', 'messages', time, req.params.message);
        console.log('Message scheduled');
        return res.send({err:null});
    } catch (err) {
        return res.send({err});
    }
  }
}
// when nextMsgTime expires, get all scheduled messages from sorted set 'messages' and log them, set new nextMsgTime if possible

async function echoMessage(time) {
    try {
        let messagesToEcho = await client.do('zrangebyscore', 'messages', '-inf', time);
        if (messagesToEcho.length === 0) {
            return;
        }
        messagesToEcho.forEach(msg => {
            console.log(`
            ${new Date()} 
            -------------------------------
            NEW MESSAGE:
            -------------------------------
            ${msg}`);
        }); 
        await client.do('zremrangebyscore', 'messages', '-inf', time);
        let nextMsg = await client.do('zrange', 'messages', 0, 0, 'WITHSCORES');
        if (nextMsg.length) {
            await client.do('set', 'nextMsgTime', nextMsg[1]);
            await client.do('expire', 'nextMsgTime',  nextMsg[1] - time);
        }
    } catch (err) {
        console.error('Oops, something went wrong', err);
    }
    
}

function getCurrentTime () {
    return Math.floor( (new Date()).getTime() / 1000 ); 
}

module.exports = new MessageController();
