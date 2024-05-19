const TelegramBot = require('node-telegram-bot-api');

// Replace with your bot's token
const token = '7183226933:AAF_6O9YxpFV9BXBSfM_HSWrAq-HQhmuoPQ';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });
const RssFeeds = new Map()

let awaitingInput = {};

// Handler for /rss command
bot.onText(/\/rss/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Send a message asking for input
    bot.sendMessage(chatId, 'Please send me your RSS feed URL.');

    // Set awaiting input status for this user
    awaitingInput[userId] = true;
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
    if (awaitingInput[userId]) {
        // Reply with the user's input + "hello!"
        let sendTest = await fetchAndFormatRssFeed(text);
        
        if(sendTest == null){
            sendMessage(chatId, "impossible to subscribe to this feed");
        }
        else{
            sendMessage(chatId, sendTest);
            if (RssFeeds.has(text)) {
                let userList = RssFeeds.get(text);
                if (!userList.includes(userId)) {
                    userList.push(userId);
                    RssFeeds.set(text, userList);
                }
            } else {
                RssFeeds.set(text, [userId]);
            }
    
            bot.sendMessage(chatId, 'RSS feed added/updated successfully.');
            console.log(RssFeeds)
            //users[chatId].feed.add(msg.text, msg.text)
        }
        

        // Reset awaiting input status
        awaitingInput[userId] = false;
    }
});

const requestOptions = {
    method: "GET",
    redirect: "follow"
  };
  
  
  //classe per descrivere un utente di telegram
class TelegramUser {
    constructor(id, name, username) {
    this.id = id;
    this.name = name;
    this.username = username
    }
}

class Feed{
    constructor(url, users) {
        this.url = url;
        this.users = users;
        }
}
  
//converte una mappa in un oggetto
function mapToObj(map){
    var obj = {}
    map.forEach(function(v, k){
    obj[k] = v
    })
    return obj
}
  
 
  
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

  
/*function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#039;');
}*/

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


  
const users = new Map();
  
  /*
  function getusers()
  {
      fetch("https://api.telegram.org/bot7183226933:AAF_6O9YxpFV9BXBSfM_HSWrAq-HQhmuoPQ/getUpdates?chat_id&offset=30", requestOptions)
    .then((response) => response.text())
    .then((result) => {
      var jsonData = JSON.parse(result);
  
      
  
      for(let i = 0; i<jsonData.result.length; i++)
      {
          console.log(jsonData.result[i].message.from.first_name)
          
          var id = jsonData.result[i].message.from.id;
          var name = jsonData.result[i].message.from.first_name;
          var username = jsonData.result[i].message.from.username;
          const user = new TelegramUser(id, name, username);
          users.set(jsonData.result[i].message.from.id, user);
      }
  
      //var jsonText = JSON.stringify(result);
      //annota tutti i messaggi su messages.json
      var fs = require('fs');
      fs.writeFile("messages.json", result, function(err) {
          if (err) {
              console.log(err);
          }
      });
  
      //annota tutti gli utenti in users.json
      var UsersText = JSON.stringify(mapToObj(users));
      var fs = require('fs');
      fs.writeFile("users.json", UsersText, function(err) {
          if (err) {
              console.log(err);
          }
      });
  
      console.log(result)
  })
    .catch((error) => console.error(error));
  
  }*/




 /*function sendMessage(id, message){
    fetch("https://api.telegram.org/bot7183226933:AAF_6O9YxpFV9BXBSfM_HSWrAq-HQhmuoPQ/sendMessage?chat_id=" + id + "&text="+message+"&parse_mode=HTML", requestOptions)
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
 }*/
