const TelegramBot = require('node-telegram-bot-api');

// Replace with your bot's token
const token = '7183226933:AAF_6O9YxpFV9BXBSfM_HSWrAq-HQhmuoPQ';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });
const RssFeeds = new Map()
const RssBuffer = new Map()

let awaitingInputRss = {};
let awaitingInputObj = {};

// Handler for /rss command
bot.onText(/\/rss/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Send a message asking for input
    bot.sendMessage(chatId, 'Please send me your RSS feed URL.');

    // Set awaiting input status for this user
    awaitingInputRss[userId] = true;
});


// Handler for /rss command
bot.onText(/\/getObject/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Send a message asking for input
    bot.sendMessage(chatId, 'Please send me the URL and Xpath of the object (format: "URL Xpath")');

    // Set awaiting input status for this user
    awaitingInputRss[userId] = true;
});

// General message handler
bot.on('message', async (msg) => {
    //ogni volta che hai un messaggio aggiorna la lista di utenti
    //getusers();
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    // Ignore messages that are commands
    if (text.startsWith('/')) {
        return;
    }

    // Check if we are awaiting input from this user
    if (awaitingInputRss[userId]) {
            
        if (RssFeeds.has(text)) 
        {
            //already have the feed stored
            //send out the buffer text
            sendMessage(chatId, RssBuffer[text]);

            //add the user to the list if they werent already subscribed
            let userList = RssFeeds.get(text);
            if (!userList.includes(userId)) {
                userList.push(userId);
                RssFeeds.set(text, userList);
            }
            else{
                sendMessage(chatId, "You were already subscribed to this feed :)")
            }
        } else 
        {
            //new rss feed!
            let sendTest = await fetchAndFormatRssFeed(text);
            if(sendTest == null){
                //something went wrong :(
                sendMessage(chatId, "impossible to subscribe to this feed");
            }
            else{
                //add all the data
                sendMessage(chatId, sendTest);
                RssFeeds.set(text, [userId]);
                RssBuffer.set(text, sendTest);
            }
            
        }

        bot.sendMessage(chatId, 'RSS feed added/updated successfully.');
        console.log(RssFeeds)
        //users[chatId].feed.add(msg.text, msg.text)
        // Reset awaiting input status
        awaitingInputRss[userId] = false;
    }
    else if(awaitingInputObj[userId])
    {
        awaitingInputObj[userId] = false;
    }
        

        
    
});

  
 // Fetch and format the RSS feed in html style
async function fetchAndFormatRssFeed(rssUrl) {
    try {

        const fetch = require('node-fetch');
        const xml2js = require('xml2js');

        const response = await fetch(rssUrl);
        const xmlData = await response.text();
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);

        const channel = result.rss.channel[0];
        const items = channel.item;

        let formattedMessage = `<b>${channel.title[0]}</b>\n`;
        formattedMessage += `<i>${channel.description[0]}</i>\n\n`;

        items.forEach(item => {
            formattedMessage += `<b>${item.title[0]}</b>\n`;
            formattedMessage += `${item.description[0]}\n`;
            formattedMessage += `<a href="${item.link[0]}">Read more</a>\n\n`;
        });

        console.log(formattedMessage);
        return formattedMessage;
    } catch (error) {
        console.error('Error fetching or parsing RSS feed:', error);
        return null;
    }
}



// manda messaggio
async function sendMessage(id, messageTOSend) {
    

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const params = {
        chat_id: id,
        text: messageTOSend,
        parse_mode: 'HTML'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        //no fetch
        if (!response.ok) {
            throw new Error(`Error sending message: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Message sent successfully!", data);
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

// Function to compare and update RSS feed data
async function checkAndUpdateFeeds() {
    for (let [rssUrl, userList] of RssFeeds) {
        const newFormattedMessage = await fetchAndFormatRssFeed(rssUrl);
        const previousFormattedMessage = RssBuffer.get(rssUrl);

        if (newFormattedMessage !== previousFormattedMessage) {
            RssBuffer.set(rssUrl, newFormattedMessage);

            userList.forEach(userId => {
                sendMessage(userId, newFormattedMessage);
            });
        }
    }
}

// Ogni ora controlla e fai il refresh dei buffer
setInterval(checkAndUpdateFeeds, 60 * 60 * 1000);


