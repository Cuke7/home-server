const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
var tram_data = require("./tram_data.js");
const autocorrect = require("autocorrect")({
  words: tram_data.dictionary,
});
const Parser = require("rss-parser");
let parser = new Parser();
const firebase = require("firebase");
const webpush = require("web-push");
const rp = require("request-promise");
const cheerio = require("cheerio");
const request = require("request");
const https = require("https");
const fs = require("fs");
const { PDFDocument } = require('pdf-lib');

const allowedOrigins = ["http://127.0.0.1:8000", "https://quotidie.netlify.app"];

// No idea what it does
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());

// Handle requests for static files
app.use(express.static("public"));

app.listen(process.env.PORT || 80, () => {
  console.log("Listening to requests on" + process.env.PORT);
});

// for Facebook verification
app.get("/uptimerobot", function (req, res) {
  res.send("Hello Uptimerobot");
});

//------------------------------------------------------------------------------------------
//-------------------------------------QUOTIDIE CODE----------------------------------------
//------------------------------------------------------------------------------------------

app.get("/get_evangile", return_evangile_API);
app.get("/get_saint", return_saint_API);

app.get("/send_notifs/", send_notifs);
app.get("/send_notifs", send_notifs);

// Firebase config
let config = {
  apiKey: "AIzaSyCgOPJ_ovnHss3uUDvITCM6OvylqWzXBNg",
  authDomain: "quotidie-7b0e6.firebaseapp.com",
  databaseURL: "https://quotidie-7b0e6.firebaseio.com",
  projectId: "quotidie-7b0e6",
  storageBucket: "",
  messagingSenderId: "630900411241",
  appId: "1:630900411241:web:b0b6961a0396176d20cbf8",
};
firebase.initializeApp(config);

// For the get_saint API
const days = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
const months = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

// send notifs to user stored in firebase
function send_notifs(req, resp) {
  let error = "no error";
  let notif_data = "Lisons l'évangile !";
  let url = "https://rss.aelf.org/evangile";
  parser
    .parseURL(url)
    .then((feed) => {
      notif_data = feed.items[0].title.substring(11) + ".";
    })
    .catch((err) => {
      console.log(err);
      error = err;
      resp.json(error);
    });
  firebase
    .database()
    .ref("PWA_users")
    .once("value")
    .then(function (data) {
      if (data.val() == null) {
        console.log("no data");
      } else {
        console.log("Got data");
        data = data.val();
        let notifs = Object.values(data);
        webpush.setVapidDetails(
          "mailto:example@yourdomain.org",
          "BNgw-Zyf0z8cX2-b45_L60or_52GbSy02Nw4bp_SAJt_M6e0Y_6W4E8u7XzDCcmkGRmkjDRL53acllyHqS7B0fs",
          "uTXl_C56pDr7cDWIcorCRMsX6BUYuKS7HrO1aqfRuzQ"
        );
        notifs.forEach((notif, i) => {
          webpush.sendNotification(JSON.parse(notif), notif_data);
        });
      }
    })
    .catch((err) => console.error(err));
  return resp.json("Hello notifications!");
}

function return_evangile_API(req, resp) {
  // Allow CORS stuff
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    resp.setHeader('Access-Control-Allow-Origin', origin);
  }
  resp.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  resp.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  resp.setHeader("Access-Control-Allow-Credentials", true);

  (async () => {
    let evangile = await get_evangile_promise();
    resp.json(evangile);
  })().catch((err) => resp.json(null));
}

function get_evangile_promise() {
  return new Promise(function (resolve, reject) {
    (async () => {
      let feed = await parser.parseURL("https://rss.aelf.org/evangile");
      let evangile = {};
      evangile.title = "Title not found.";
      evangile.text = "Text not found.";
      if (feed.items.length == 1 || feed.items.length == 2) {
        evangile.title = feed.items[0].title;
        evangile.text = feed.items[0].content;
      } else {
        evangile.title = feed.items[3].title;
        evangile.text = feed.items[3].content;
      }
      resolve(evangile);
    })().catch((err) => {
      console.error(err);
      reject();
    });
  });
}

function return_saint_API(req, resp) {
  // Allow CORS stuff
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    resp.setHeader('Access-Control-Allow-Origin', origin);
  }
  resp.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  resp.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  resp.setHeader("Access-Control-Allow-Credentials", true);

  (async () => {
    let evangile = await get_saint_promise();
    resp.json(evangile);
  })().catch((err) => resp.json(null));
}

function get_saint_promise() {
  var d = new Date();
  var day_m = d.getDate();
  var day = d.getDay();
  var month = d.getMonth();
  let url2 = days[day] + "-" + day_m + "-" + months[month];
  let url = "https://fr.aleteia.org/daily-prayer/" + url2 + "/";

  return new Promise(function (resolve, reject) {
    rp(url)
      .then(function (body) {
        const $ = cheerio.load(body);
        let saint = {};
        saint.title = $(".css-1tmjk0q")["0"].children[0].data;
        saint.subtitle = $(".css-al50z9")["0"].children[0].data;
        saint.test = "Test";
        saint.image_url = $(".css-tefugr")["0"].attribs.src;
        resolve(saint);
      })
      .catch(function (err) {
        console.log(err);
        reject();
      });
  });
}

//------------------------------------------------------------------------------------------
//-------------------------------------FACEBOOK CODE----------------------------------------
//------------------------------------------------------------------------------------------

// Facebook trambot page token
const token =
  "EAAFspsZAMUr8BAP03QzmPnWBMikcVHhEOzZBIlTdTH0GtolCwHN88XXTXVeQosRGIfLtl60yvGQW2NSK0XHd2YWHqSzqLrra8aWeZAFLQG49sDXFSyWA9RhItwusnwnTrUeLNY52iZATD9zck7b0kXHfNejOZAJSVqIZBOkgXbXQZDZD";

// for Facebook verification
app.get("/webhook/", function (req, res) {
  if (req.query["hub.verify_token"] === "myToken") {
    res.send(req.query["hub.challenge"]);
  }
  res.send("Error, wrong token");
});

app.post("/webhook", (req, res) => {
  // Parse the request body from the POST
  let body = req.body;
  // Check the webhook event is from a Page subscription
  if (body.object === "page") {
    body.entry.forEach(function (entry) {
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;
      if (webhook_event.message) {
        if (webhook_event.message.quick_reply) {
          //handleQuickReply(sender_psid, webhook_event.message.quick_reply);
        } else {
          handleMessage(sender_psid, webhook_event.message);
        }
      }
      if (webhook_event.postback) {
        //handlePostback(sender_psid, webhook_event.postback);
      }
    });
    // Return a '200 OK' response to all events
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

function handleMessage(sender_psid, received_message) {
  typing_on(sender_psid);
  let message = received_message.text;
  if (!received_message.is_echo) {
    get_times_for_FB(message, sender_psid);
  }
}

function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    messaging_type: "RESPONSE",
    recipient: {
      id: sender_psid,
    },
    message: response,
  };

  // Send the HTTP request to the Messenger Platform
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: {
        access_token: token,
      },
      method: "POST",
      json: request_body,
    },
    (err, res, body) => {
      if (!err) {
        console.log("message sent!");
      } else {
        console.error("Unable to send message:" + err);
      }
    }
  );
}

function typing_on(sender_psid) {
  // Construct the message body
  let request_body = {
    messaging_type: "RESPONSE",
    recipient: {
      id: sender_psid,
    },
    sender_action: "typing_on",
  };

  // Send the HTTP request to the Messenger Platform
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: {
        access_token: token,
      },
      method: "POST",
      json: request_body,
    },
    (err, res, body) => {
      if (!err) {
        console.log("Typingon  sent!");
      } else {
        console.error("Unable to send typing on:" + err);
      }
    }
  );
}

function send_error(sender_psid) {
  let response = {
    text:
      "🤖 Oups, je n'ai pas réussi à récupérer l'horaire du tram... désolé !",
  };
  callSendAPI(sender_psid, response);
}

function get_times_for_FB(station, sender_psid) {
  var station_input = station;

  console.log(station_input);

  let info = get_url(station_input);
  let url = info[1];

  function get_url(input) {
    let station = autocorrect(input);

    let rep = [];
    for (let i = 0; i < tram_data.bordeaux.length; i++) {
      if (tram_data.bordeaux[i][0] == station) {
        rep = [station, [tram_data.bordeaux[i][1]]];
      }
    }
    for (let i = 0; i < tram_data.pessac.length; i++) {
      if (tram_data.pessac[i][0] == station) {
        rep[1].push(tram_data.pessac[i][1]);
      }
    }
    return rep;
  }

  (async () => {
    try {
      const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      let response_all = [];

      for (let dir = 0; dir < 2; dir++) {
        const page = await browser.newPage();
        await page.goto(url[dir]);

        await page.waitForSelector(".waittime");

        let times_temp = await page.evaluate(() => {
          let times = [];
          let trams = document.getElementsByClassName(
            "display-flex justify-space-between align-content-stretch align-items-end"
          );
          for (const tram of trams) {
            let temp = tram.innerText;
            temp = temp.substring(0, temp.length - 1);
            times.push(temp);
          }
          return times;
        });

        let direction_name;

        if (dir == 0) direction_name = "Bordeaux";
        if (dir == 1) direction_name = "Pessac";

        let response_temp = {
          station: info[0],
          direction: direction_name,
          url: url[dir],
          data: times_temp,
        };

        response_all.push(response_temp);
      }
      await browser.close();

      let data_time = response_all;
      let title = "🚊 " + data_time[0].station + " :";
      let url1 = data_time[0].url;
      let url2 = data_time[1].url;

      let sub1 = "";
      for (let i = 0; i < data_time[0].data.length; i++) {
        sub1 =
          sub1 +
          "\u000A➡️ " +
          data_time[0].data[i].split("\n")[0] +
          " 🕒 " +
          data_time[0].data[i].split("\n")[1];
      }

      let sub2 = "";
      for (let i = 0; i < data_time[1].data.length; i++) {
        sub2 =
          sub2 +
          "\u000A➡️ " +
          data_time[1].data[i].split("\n")[0] +
          " 🕒 " +
          data_time[1].data[i].split("\n")[1];
      }

      let response = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: title,
                subtitle: sub1,
                buttons: [
                  {
                    type: "web_url",
                    url: url1,
                    title: "infoTbm",
                    messenger_extensions: false,
                    webview_height_ratio: "tall",
                  },
                ],
              },
              {
                title: title,
                subtitle: sub2,
                buttons: [
                  {
                    type: "web_url",
                    url: url2,
                    title: "infoTbm",
                    messenger_extensions: false,
                    webview_height_ratio: "tall",
                  },
                ],
              },
            ],
          },
        },
      };
      callSendAPI(sender_psid, response);
    } catch (error) {
      send_error(sender_psid);
    }
  })();
}

//------------------------------------------------------------------------------------------
//-------------------------------------P8 WATCH CODE----------------------------------------
//------------------------------------------------------------------------------------------

// Weather API for Talence city
app.get("/weather", function (req, res) {
  let lat = "44.492906";
  let long = "-0.639854";
  let API_key = "5079817a0f73cd7ba5f93db4dab118c9";
  let url =
    "https://api.openweathermap.org/data/2.5/onecall?lat=" +
    lat +
    "&lon=" +
    long +
    "&exclude=current,minutely,daily&appid=" +
    API_key;

  request(url, function (error, response, body) {
    let toto = JSON.parse(body);
    var newDate = new Date();
    for (const weather_obj of toto.hourly) {
      delete weather_obj.pressure;
      delete weather_obj.humidity;
      delete weather_obj.dew_point;
      delete weather_obj.wind_speed;
      delete weather_obj.wind_deg;
      newDate.setTime(weather_obj.dt * 1000);
      weather_obj.dt = newDate.toUTCString();
    }
    let resp =
      Math.round(toto.hourly[2].temp - 273.15) +
      "° " +
      toto.hourly[2].weather[0].description +
      ";" +
      toto.hourly[2].weather[0].icon;
    res.send(resp);
  });
});

// Geoloc station time API
app.get("/get_station_time_for_P8_geoloc", function (req, res) {
  var coords = req.query.coords;
  coords = coords.split(",");

  let distance_min = 60000000;
  let station = "";
  for (const station_obj of tram_data.geoloc) {
    let distance_temp = distance(
      station_obj.pos[0],
      station_obj.pos[1],
      coords[0],
      coords[1],
      "K"
    );
    console.log(distance_temp);
    if (distance_temp < distance_min) {
      distance_min = distance_temp;
      station = station_obj.name;
      console.log(station + " : " + distance_temp);
    }
  }

  let info = get_url(station);

  let url = info[1];

  function get_url(input) {
    let station = autocorrect(input);

    let rep = [];
    for (let i = 0; i < tram_data.bordeaux.length; i++) {
      if (tram_data.bordeaux[i][0] == station) {
        rep = [station, [tram_data.bordeaux[i][1]]];
      }
    }
    for (let i = 0; i < tram_data.pessac.length; i++) {
      if (tram_data.pessac[i][0] == station) {
        rep[1].push(tram_data.pessac[i][1]);
      }
    }
    return rep;
  }

  (async () => {
    try {
      const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      let response_all = [];

      for (let dir = 0; dir < 2; dir++) {
        const page = await browser.newPage();
        await page.goto(url[dir]);

        await page.waitForSelector(".waittime");

        let times_temp = await page.evaluate(() => {
          let times = [];
          let trams = document.getElementsByClassName(
            "display-flex justify-space-between align-content-stretch align-items-end"
          );
          for (const tram of trams) {
            let temp = tram.innerText;
            //temp = temp.substring(0, temp.length - 1);
            times.push(temp);
          }
          return times;
        });

        let direction_name;

        if (dir == 0) direction_name = "Bordeaux";
        if (dir == 1) direction_name = "Pessac";

        let response_temp = {
          station: info[0],
          direction: direction_name,
          url: url[dir],
          data: times_temp,
        };

        response_all.push(response_temp);
      }

      let response =
        station +
        ";" +
        response_all[0].data[0].replace("\n", " ") +
        ";" +
        response_all[1].data[0].replace("\n", " ") +
        ";";

      res.send(response);

      await browser.close();
    } catch (err) {
      console.log(err);
    }
  })();
});

function distance(lat1, lon1, lat2, lon2, unit) {
  if (lat1 == lat2 && lon1 == lon2) {
    return 0;
  } else {
    var radlat1 = (Math.PI * lat1) / 180;
    var radlat2 = (Math.PI * lat2) / 180;
    var theta = lon1 - lon2;
    var radtheta = (Math.PI * theta) / 180;
    var dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == "K") {
      dist = dist * 1.609344;
    }
    if (unit == "N") {
      dist = dist * 0.8684;
    }
    return dist;
  }
}

//------------------------------------------------------------------------------------------
//-------------------------------------DASHBOARD CODE---------------------------------------
//------------------------------------------------------------------------------------------
app.get("/get_rasp_temp/", function (req, res) {
  temp = fs.readFileSync(
    "/home/pi/Documents/scripts/temperature/measures/temperature.txt",
    "utf8"
  );
  res.json(temp);
});

let pdf = null;

//------------------------------------------------------------------------------------------
//----------------------------------ATTESTATION GENERATOR-----------------------------------
//------------------------------------------------------------------------------------------

app.get("/generate_attestation", function (req, res) {
  (async () => {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: 'chromium-browser',
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    await page.goto('https://media.interieur.gouv.fr/deplacement-covid-19');

    await page.type('#field-firstname', 'Louis');
    await page.type('#field-lastname', 'Cassany');
    await page.type('#field-birthday', '04/05/1995');
    await page.type('#field-placeofbirth', 'Arès');
    await page.type('#field-address', "3 route d'Acrachon");
    await page.type('#field-city', 'Hostens');
    await page.type('#field-zipcode', '33125');
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();

    today = mm + '/' + dd + '/' + yyyy;
    await page.type('#field-datesortie', today);

    var now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).slice(0, -3);
    var notation = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).slice(-2);

    if (notation === "PM") {
      now = Number(now.slice(0, 2)) + 12 + "" + now.slice(-3)
    }


    await page.$eval('#field-heuresortie', el => el.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).slice(0, -3));

    var reason = req.query.reason;
    if (reason.includes("course")) {
      await page.evaluate(() => {
        document.querySelector("#checkbox-achats").click();
      });
      console.log("C'est pour aller faire des courses");
    } else {
      await page.evaluate(() => {
        document.querySelector("#checkbox-sport_animaux").click();
      });
      console.log("C'est pour aller faire du sport");
    }


    await page.evaluate(() => {
      document.querySelector("#generate-btn").click();
    });

    await page.waitForSelector("[href*=\"blob:https://\"]");

    //await page.waitForFunction('document.body.lastElementChild.href.includes("https://")');

    let url = await page.evaluate(() => {
      let toto = document.body.lastElementChild.href;
      return toto;
    });

    //await page.goto(url);

    async function getPdf() {
      return page.evaluate(url => {
        return new Promise(async resolve => {
          const reader = new FileReader();
          const response = await window.fetch(url)
          const data = await response.blob();
          debugger;
          reader.readAsBinaryString(data);
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject('Error occurred while reading binary string');
        });
      }, url);
    }
    const pdfString = await getPdf();
    const pdfData = Buffer.from(pdfString, 'binary');
    //console.log(pdfData)
    res.setHeader('Content-Type', 'application/pdf');
    pdf = pdfData;
    res.send(pdfData)
    console.log(now);
    send_attestation();

    browser.close();

  })();
});


// send notifs to user stored in firebase
function send_attestation() {
  let notif_data = "Votre attestation a été générée.";

  let notif = "{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/coF54wPAlt0:APA91bELT2AKd8XcrO8DXvpDlotkv1HrWVxL38JY7Lst_YD3nGeqwQxcE_-np9MA9iJBMRVD_d6s8xKvuIT13EIPV1_cVPMRNMxfsdB1lG3tG0HWr-2kbOTIJJm-YFA3V7iUiWi8ZRR5\",\"expirationTime\":null,\"keys\":{\"p256dh\":\"BOUDREY4zxN20OfwG685VKnGPsOFBmGxs8El63EWvxfOgs8N8VBq-KkA_QNsO59eAyj2WFZQCo5preDPNKl_TbI\",\"auth\":\"S-xvqYu3i8EYoP0HnkOJtg\"}}";
  webpush.setVapidDetails(
    "mailto:example@yourdomain.org",
    "BNgw-Zyf0z8cX2-b45_L60or_52GbSy02Nw4bp_SAJt_M6e0Y_6W4E8u7XzDCcmkGRmkjDRL53acllyHqS7B0fs",
    "uTXl_C56pDr7cDWIcorCRMsX6BUYuKS7HrO1aqfRuzQ"
  );
  webpush.sendNotification(JSON.parse(notif), notif_data);
}

app.get("/get_attestation", function (req, res) {

  async function signPDF(pdfBuffer, imgBuffer) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pngImage = await pdfDoc.embedPng(imgBuffer);
    const pngDims = pngImage.scale(0.07)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    firstPage.drawImage(pngImage, {
      x: 200,
      y: 20,
      width: pngDims.width,
      height: pngDims.height,
    })
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    //console.log(buffer)
    res.setHeader('Content-Type', 'application/pdf');
    var now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const regex = /:/gi;
    now = now.replace(regex, "_");
    res.setHeader("Content-Disposition", "attachment; filename=attestation_" + now + ".pdf");
    res.send(buffer)
  }

  fs.readFile("signature.png", (err2, imgBuffer) => {
    signPDF(pdf, imgBuffer);
  })

})
