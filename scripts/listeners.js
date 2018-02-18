var tryMQsetting = require('../../../config').tryMQ;
var modReq = require('tryMQ-client');
var mod = new modReq();

// (Node-ID, Broker adress, connect cb, disconnect cb) 
mod.setup('FB', tryMQsetting, connected, disconnected);
function connected(){
	mod.log('Connected!');
}
function disconnected(){
	mod.log('Disonnected!');
}





var context;
var last;


function listen(thread) {
	try{
		
		var msg = {
			type: 'fb',
			senderID: thread.name,
			body: thread.snippet,
			threadID: thread.thread_fbid,
			messageID: thread.thread_fbid,
			attachments: thread.attachments,		
			timestamp: thread.timestamp,
			isGroup: thread.isGroup
		};
		
		if (last && last.timestamp && 
			msg.timestamp > last.timestamp + 1000
			/*!= msg.body*/) {
			mod.publish('/RECEIVE/msg', msg);
		}
		last = msg;
		
	}catch(e){
		mod.err('listenTry => ' + e + JSON.stringify(e) );
		return;
	}
}


//{body: , threadID: }
mod.subscribe('/FB/sendMsg', function (msg) {
	try{		
		// Protection contre le spam a mettre ici /!\
		context.sendMessageListener(msg.body, msg.threadID);
	}catch(e){
		mod.err('send => ' + e + JSON.stringify(e) ); 
	}
});


//{}
mod.subscribe('/FB/logout', function () {
	process.exit(1);
});














const { refreshConsole } = require('./util');
const heading = require('./heading');
const search = require('./search');

const messageLimit = 75;

class Listeners {
    constructor() {
    }

    setMessenger(messenger) {
        this.messenger = messenger;
    }

    getThreadIdListener(option, callback) {
        let threadInfo = this.options[option];
        callback(threadInfo.thread_fbid);
    }

    getThreadInfo(id, callback) {
        for (let thread in this.options) {
            if (this.options[thread].thread_fbid === id)
                return callback (null, this.options[thread]);
        }

        return callback(new Error(`Could not find thread information for thread with ${id}`));
    }

    printThreadSnippet(thread, idx, isGroup) {
        let line = `[${idx.toString().cyan}] ${thread.name.green} : `;

        if (thread.snippet && thread.snippet.length > messageLimit) {
            thread.snippet = `${ thread.snippet.substr(0, messageLimit) }...`;
        }

        if (thread.snippet !== '')
            line += `${thread.snippet} `;

        if (!isGroup && thread.attachements) {
            for (let j = 0; j < thread.attachments.length; j++) {
                const a = thread.attachments[j];
                line += '[ '.red + a.attach_type + ' ]'.red;
            }
        }

        console.log(line);
    }

    conversationsListener(userId, callback) {
        this.messenger.getThreads((err, threads) => {
            if (err) {
                // This only loads once, if it fails, close app
                console.error('Found error while fetching conversations.', err);
                console.log(`Could not properly initialize conversation listener. \nReason: ${err}. \nExiting...`);
                process.exit(1);
            }

            /*refreshConsole();*/
            this.options = {};

            threads.sort((a, b) => b.timestamp - a.timestamp);
			var thread = threads[0];
			//thread.isGroup = isGroup;
			console.log(thread);
			listen(thread);
			
			/*
            for (let i = 0; i < threads.length; ++i) {
                const thread = threads[i];
                this.printThreadSnippet(thread, i, thread.isGroup);
                this.options[i] = thread;
                if (thread.thread_fbid !== userId) {
                    heading.data.push({fbid: thread.thread_fbid, name: thread.name, unread: 0});
                }
            }

            console.log("Select conversation :");
            callback({action: 0, threadCount: threads.length});*/
        });
    }

    getConversationsListener(userId, cb) {
        this.conversationsListener(userId, cb);
    }

    sendMessageListener(m, recipientId) {
        if (this.messenger.users[recipientId]) {
            this.messenger.sendMessage(this.messenger.users[recipientId].vanity, recipientId, m, (err) => {
                if (err) {
                    console.log('Message did not send properly');
                }
            });
        } else {
            // This is a group and not a single user
            this.messenger.sendGroupMessage(recipientId, m, (err) => {
                if (err) {
                    console.log('Message did not send properly');
                }
            });
        }
    }

    searchListener(searchStr, callback) {
        const parts = searchStr.split(' ');

        // If there was no value after
        if (parts.length === 1 && parts[0].toLowerCase() === '/search') {
            console.log('Try adding a search string after! (/search <query>)'.cyan);
        } else if (parts.length > 1 && parts[0].toLowerCase() === '/search') {
            parts.shift();
            search.run(parts.join(' '));
        } else {
            // On conversation selection
            const id = search.selectConvo(searchStr);
            if (id) {
                // Return the action and the id we found with our search
                callback(1, id);
            } else { // On invalid id or empty search
                callback(-1);
            }
        }
    }
}

module.exports = Listeners;

