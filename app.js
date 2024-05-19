const TelegramBot = require('node-telegram-bot-api');
const { Builder, By, Key, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

//bot token
const token = '7183226933:AAF_6O9YxpFV9BXBSfM_HSWrAq-HQhmuoPQ';

//creo il bot
const bot = new TelegramBot(token, { polling: true });

const RssFeeds = new Map()
const RssBuffer = new Map()

let awaitingInputRss = {};
let awaitingInputObj = {};

// is called when someone uses /rss command
bot.onText(/\/rss/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, 'Please send me your RSS feed URL.');

    //aspetta per una risposta
    awaitingInputRss[userId] = true;
});


//  is called when someone uses /getObject command
bot.onText(/\/get_object/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, 'Please send me the URL and Xpath of the object (format: "URL Xpath"). If the object is too large parts might be cut off at the end');

    //aspetta per una risposta
    awaitingInputObj[userId] = true;
});

//ogni messaggio ricevuto
bot.on('message', async (msg) => {
    //ogni volta che hai un messaggio aggiorna la lista di utenti
    //getusers();
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    //ignora se é un comando
    if (text.startsWith('/')) {
        return;
    }

    //se stiamo aspettando risposte
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
                bot.sendMessage(chatId, 'RSS feed added/updated successfully.');
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

        
        console.log(RssFeeds)
        //users[chatId].feed.add(msg.text, msg.text)
        // Reset awaiting input status
        awaitingInputRss[userId] = false;
    }
    else if(awaitingInputObj[userId])
    {
        // try{
            //parse of user data
            let userInput = text.split(" ")
            let wantedObject = await getElementByXPath(userInput[0], userInput[1]);
            if(wantedObject != null){
                console.log(wantedObject)
                rusticMessage(userId, wantedObject);
            }
            else{
                sendMessage(userId, "we couldnt get your object :(")
            }
            awaitingInputObj[userId] = false;
        //}
        /* catch{
            sendMessage(userId, "the url and the xpath given werent in the right format")
        } */

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

//controlla se ci sono nuove informazioni e se si le manda a tutti gli interessati
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




async function getElementByXPath(url, xpath) {
    // Set up Firefox options
    const firefoxOptions = new firefox.Options();

    // Set up WebDriver with Firefox
    const driver = await new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(firefoxOptions)
        .build();

    try {
        // Navigate to the URL
        await driver.get(url);

        // Wait for the element to be located
        const element = await driver.wait(until.elementLocated(By.xpath(xpath)), 10000);

        // Wait for the element to be visible
        await driver.wait(until.elementIsVisible(element), 10000);

        // Get the inner HTML of the element
        const htmlContent = await element.getAttribute('innerHTML');

        // Return the HTML content
        return htmlContent;
    } catch (error) {
        console.error('Error:', error);
        return null;
    } finally {
        // Close the WebDriver
        await driver.quit();
    }
}

const requestOptions = {
    method: "GET",
    redirect: "follow"
  };

 function rusticMessage(id, message){
    fetch("https://api.telegram.org/bot7183226933:AAF_6O9YxpFV9BXBSfM_HSWrAq-HQhmuoPQ/sendMessage?chat_id=" + id + "&text="+message, requestOptions)
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
 }