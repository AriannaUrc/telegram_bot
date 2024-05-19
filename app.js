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
  
    //converte una mappa in un oggetto
  function mapToObj(map){
      var obj = {}
      map.forEach(function(v, k){
      obj[k] = v
      })
      return obj
  }
  
 
  
  // prende e parsa il feed rss dato in stile html-like di telegram
  async function fetchAndFormatRssFeed(rssUrl) {
      try {

          const fetch = require('node-fetch');
          const xml2js = require('xml2js');

          const response = await fetch(rssUrl);
          const xmlData = await response.text();
          const p = new xml2js.Parser();
          const result = await p.parseStringPromise(xmlData);
  
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
          console.error('Errore durante la lettura del feed rss:', error);
          return "impossibile leggere questo feed";
      }
  }
  
  //esempio
  const rssUrl = 'https://www.repubblica.it/rss/economia/rss2.0.xml';
  fetchAndFormatRssFeed(rssUrl);
  
  
  getusers();
  
  function getusers()
  {
      fetch("https://api.telegram.org/bot7183226933:AAF_6O9YxpFV9BXBSfM_HSWrAq-HQhmuoPQ/getUpdates?chat_id&offset=30", requestOptions)
    .then((response) => response.text())
    .then((result) => {
      var jsonData = JSON.parse(result);
  
      const users = new Map();
  
      for(let i = 0; i<jsonData.result.length; i++)
      {
          console.log(jsonData.result[i].message.from.first_name)
          
          var id = jsonData.result[i].message.from.id;
          var name = jsonData.result[i].message.from.first_name;
          var username = jsonData.result[i].message.from.username;
          const user = new TelegramUser(id, name, username);
          users.set(jsonData.result[i].message.from.username, user);
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
  
  }