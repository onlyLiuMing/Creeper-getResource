// import node module
const fs = require('fs');

// import form node_module
const CDP = require("chrome-remote-interface");

// defined default arguments
let url = process.argv[2];
let LINKS = [];

CDP(client => {
  // extract domains
  const {Network, Page} = client;
  // setup handlers
  Network.requestWillBeSent(params => {
    LINKS.push(params.request.url);
    // console.log(params.request.url);
  });
  Page.loadEventFired(() => {
    let file = fs.createWriteStream('./links/links.txt');
    // console.log(LINKS.join('\n'));
    file.write(LINKS.join('\n'));
    client.close();
  });
  // enable events then start!
  Promise.all([
    Network.enable(),
    Page.enable()
  ]).then(() => {
    return Page.navigate({url: url});
  }).catch(err => {
    console.error(err);
    client.close();
  });
}).on("error", err => {
  // cannot connect to the remote endpoint
  console.error(err);
});